class SubGroup {
  constructor() {
    this.value = 0;
    /** @type {Set<string>} */
    this.sources = new Set();
    /** @type {{[instance: string]: number} | null} */
    this.instances = null;
  }

  /**
   * @param {string | number} hitCount
   */
  add(hitCount) {
    hitCount = parseInt(hitCount);
    this.value += hitCount;
  }
}

class Group {
  constructor() {
    /** @type {{[subGroup: string]: SubGroup}} */
    this.subGroups = Object.create(null);
  }

  /**
   * @param {string} name
   * @returns {SubGroup}
   */
  getSubGroup(name) {
    if (!(name in this.subGroups)) {
      return (this.subGroups[name] = new SubGroup());
    }
    return this.subGroups[name];
  }

  /** @type {[hits: number, total: number]} */
  stats(store = null) {
    let total = 0;
    let hits = 0;
    const instance = store?.selectedInstance;
    for (const x of Object.values(this.subGroups)) {
      const value = hitCountFor(x, instance);
      if (value === null) continue;
      hits += value > 0 ? 1 : 0;
      total += 1;
    }
    return [hits, total];
  }
}

class Line {
  constructor() {
    this.value = 0;
    /** @type {{[groups: string]: Group} | null} */
    this.groups = null;
    /** @type {Set<string>} */
    this.sources = new Set();
    /** @type {{[instance: string]: number} | null} */
    this.instances = null;
  }

  /**
   * @param {string | number} hitCount
   */
  add(hitCount) {
    hitCount = parseInt(hitCount);
    this.value += hitCount;
  }

  /**
   * @param {string} name
   * @returns {Group}
   */
  getGroup(name) {
    if (!this.groups) {
      this.groups = Object.create(null);
    }
    if (!(name in this.groups)) {
      return (this.groups[name] = new Group());
    }
    return this.groups[name];
  }

  /** @type {boolean} */
  get hasGroups() {
    return !!this.groups;
  }

  /** @type {[hits: number, total: number]} */
  stats(store = null) {
    let hits = 0;
    let totals = 0;
    const instance = store?.selectedInstance;
    if (this.hasGroups) {
      for (const group of Object.values(this.groups)) {
        const [groupHits, groupTotals] = group.stats(store);
        hits += groupHits;
        totals += groupTotals;
      }
    } else if (!instance && store && store.testsAsTotal && store.tests.size !== 0 && this.sources) {
      hits = this.sources.size;
      totals = store.tests.size;
    } else {
      const value = hitCountFor(this, instance);
      if (value === null) return [0, 0];
      hits = value > 0 ? 1 : 0;
      totals = 1;
    }
    return [hits, totals];
  }
}

export class Record {
  constructor(sourceFile, records = null) {
    /** @type {string} */
    this.sourceFile = sourceFile;
    /** @type {Line[]} */
    this.lines = [];

    if (records) {
      records[sourceFile] = this;
    }
  }

  /**
   * @param {number} line
   * @param {boolean?} create
   * @returns {Line}
   */
  getLine(line, create=true) {
    if (create && !(line in this.lines)) {
      return (this.lines[line] = new Line());
    }
    return this.lines[line];
  }

  /** @type {[hits: number, total: number]} */
  stats(store = null) {
    let hits = 0;
    let total = 0;
    for (const line of this.lines) {
      if (!line) continue;

      const [lineHits, lineTotal] = line.stats(store);
      hits += lineHits;
      total += lineTotal;
    }
    return [hits, total];
  }
}

/**
 * Hits for a line or subgroup, optionally restricted to one hierarchy.
 * `null` means this point does not belong to the selected instance.
 *
 * @param {{value?: number, instances?: {[hier: string]: number} | null}} obj
 * @param {string?} instance
 * @returns {number | null}
 */
export function hitCountFor(obj, instance) {
  if (!obj) return 0;
  if (!instance || !obj.instances) return obj.value ?? 0;
  if (!Object.hasOwn(obj.instances, instance)) return null;
  return obj.instances[instance];
}

/**
 *
 * @param {string} text
 * @param {string} separator
 * @returns {[first: string, second: string]}
 */
function splitFirst(text, separator) {
  const separatorIndex = text.indexOf(separator);
  if (separatorIndex < 0) {
    throw Error(`Separator '${separator}' not present`);
  }
  return [
    text.slice(0, separatorIndex),
    text.slice(separatorIndex + 1),
  ];
}

/**
 * @param {string} content
 * @param {string?} namePrefix
 * @returns {Generator<[name: string, lines: [prefix: string, data: string][]]>}
 */
function *getRecords(filename, content, namePrefix = null) {
  let lines = [];
  let name = "";
  for (let line of content.split(/\r?\n/)) {
    line = line.trim();
    if(!line || line.startsWith('#')) {
      continue; // Skip empty lines and comments
    }

    if (line === "end_of_record") {
      yield [name, lines]
      name = "";
      lines = [];
      continue;
    }

    try {
      const [prefix, content] = splitFirst(line, ':');
      if (prefix === namePrefix) {
        name = unifySourcePath(content);
        continue;
      }

      lines.push([prefix, content]);
    } catch (e) {
      console.error(`The ${filename} file seems malformed, encountered line without any colon other than "end_of_record": ${line}`);
      continue;
    }
  }
}

export function parseInfo(filename, content, records) {
  for (const [name, lines] of getRecords(filename, content, "SF")) {
    /** @type {Record} */
    const record = name in records ? records[name] : new Record(name, records);
    for (const [prefix, data] of lines) {
      switch (prefix) {
        case "DA": {
          const [lineNum, hitCount] = data.split(",");
          record.getLine(parseInt(lineNum)).add(hitCount);
          break;
        }
        case "BRDA": {
          const [lineNum, groupNum, name, hitCount] = data.split(",");
          record.getLine(parseInt(lineNum)).getGroup(groupNum).getSubGroup(name).add(hitCount);
          break;
        }
        default:
          break; // Ignore other prefixes
      }
    }
  }
}

// returns list of tests
export function parseDesc(filename, content, records) {
  const allTests = new Set();
  for (const [name, lines] of getRecords(filename, content, "SN")) {
    /** @type {Record} */
    const record = records[name];
    if (!record) {
      console.error(`Source file: ${name} does not exist; ignoring.`)
      continue;
    }

    for (const [prefix, data] of lines) {
      if (prefix === "TEST") {
        const [lineNum, tests] = data.split(",");
        const line = record.getLine(parseInt(lineNum), false);
        if (!line) {
          console.log(`Line: ${lineNum} does not exist in record: ${name}; ignoring.`);
          continue;
        }
        for(const test of tests.split(";")) {
          allTests.add(test);
          line.sources.add(test);
        }
      }
      // Ignore other prefixes
    }
  }
  return allTests;
}

/**
 * @param {string} filepath
 * @param {string} content
 * @param {{[file: string]: Record}} records
 * @returns {{[file: string]: Record}}
 */
export function parseTable(filepath, content, records) {
  for (const [source, lines] of getRecords(filepath, content, "SF")) {
    const hadRecord = Object.hasOwn(records, source);
    const record = hadRecord ? records[source] : new Record(source, null);
    for (const [prefix, data] of lines) {
      try {
        if (prefix === "BRDA") {
          const [_, __, name, hitCount] = data.split(",");
          const [title, rest] = splitFirst(name, ".");
          record.getLine(0).getGroup(title).getSubGroup(rest).add(hitCount);
        }
      } catch (e) {
        console.error(`Incorrect line if file '${filepath}': ${prefix}:${data}`);
        continue;
      }
    }

    if (!hadRecord && (record.lines[0]?.hasGroups ?? false)) {
      // Only add the record if it actually contains any data
      records[source] = record;
    }
  }
}

/**
 * @param {string} path
 * @returns {string} Unified path
 */
export function unifySourcePath(path) {
  var components = path.split("/")
  var unifiedComponents = []

  for (var comp of components) {
    if (comp == ".." && unifiedComponents.length > 0) {
      unifiedComponents.pop()
    } else if (comp != "." && comp != "") {
      unifiedComponents.push(comp)
    }
  }

  return unifiedComponents.join('/')
}

/**
 * Match a DAT source path to a file already present in `.info` or `sources.txt`.
 * DAT files keep the simulator checkout prefix (`/__w/.../design/...`) while
 * Coverview stores the project-relative suffix (`design/...`).
 *
 * @param {string} datPath
 * @param {Set<string>} knownPaths
 * @returns {string}
 */
export function matchDatSourcePath(datPath, knownPaths, checkoutPrefix) {
  const unified = unifySourcePath(datPath);
  if (knownPaths.has(unified)) return unified;
  if (checkoutPrefix && unified.startsWith(checkoutPrefix)) return unified.slice(checkoutPrefix.length);

  let best = "";
  for (const candidate of knownPaths) {
      if (unified.endsWith(`/${candidate}`) && candidate.length > best.length) best = candidate;
  }
  return best || unified;
}

/**
 * If any DAT path ends with a known source path, the leftover prefix is the
 * simulator checkout root and can be stripped from every DAT file.
 *
 * @param {string[]} datPaths
 * @param {Set<string>} knownPaths
 * @returns {string}
 */
function inferDatCheckoutPrefix(datPaths, knownPaths) {
  for (const datPath of datPaths) {
    const unified = unifySourcePath(datPath);
    for (const known of knownPaths) {
      if (unified.endsWith(`/${known}`)) return unified.slice(0, unified.length - known.length);
    }
  }
  return '';
}

function mergeInstanceHits(current, extra) {
  if (!extra || Object.keys(extra).length === 0) return current ?? null;
  const merged = current ? { ...current } : Object.create(null);
  for (const [hier, hits] of Object.entries(extra)) merged[hier] = (merged[hier] ?? 0) + hits;
  return merged;
}

/**
 * @typedef {{hits?: number, instances?: {[hier: string]: number}, groups?: {[group: string]: {[name: string]: {hits?: number, instances?: {[hier: string]: number}}}}}} DatLineExport
 */

/**
 * @param {Record} record
 * @param {{lines?: {[line: string]: DatLineExport}}} datRecord
 * @param {boolean} writeHits  When false, only attach instance maps.
 */
function applyDatRecord(record, datRecord, writeHits) {
  for (const [lineNum, datLine] of Object.entries(datRecord?.lines ?? {})) {
    const line = record.getLine(parseInt(lineNum), writeHits);
    if (!line) continue;
    if (writeHits && datLine.hits) line.add(datLine.hits);
    line.instances = mergeInstanceHits(line.instances, datLine.instances);

    for (const [groupName, group] of Object.entries(datLine.groups ?? {})) {
      for (const [subName, sub] of Object.entries(group ?? {})) {
        const dest = writeHits ? line.getGroup(groupName).getSubGroup(subName) : line.groups?.[groupName]?.subGroups?.[subName];
        if (!dest) continue;
        if (writeHits && sub.hits) dest.add(sub.hits);
        dest.instances = mergeInstanceHits(dest.instances, sub.instances);
      }
    }
  }
}

/**
 * Build a JS `Record` from the WASM DAT export for one coverage type.
 *
 * @param {string} sourceFile
 * @param {{lines: {[line: string]: DatLineExport}}} datRecord
 * @returns {Record}
 */
export function recordFromDat(sourceFile, datRecord) {
  const record = new Record(sourceFile);
  applyDatRecord(record, datRecord, true);
  return record;
}

const mergeInstanceLists = (current, extra) => Array.from(new Set([...(current || []), ...(extra || [])]));

/**
 * @param {{[path: string]: {instances?: string[], records?: {[type: string]: {lines: {[line: string]: DatLineExport}}}}}} datFiles
 * @param {{[path: string]: {records: {[type: string]: Record}, source?: string, instances?: string[]}}} datasetFiles
 * @param {{[path: string]: string}} sources
 */
export function applyDatCoverage(datFiles, datasetFiles, sources, allowedCoverageTypes) {
  if (!datFiles) return;

  const knownPaths = new Set([...Object.keys(datasetFiles), ...Object.keys(sources)]);
  const checkoutPrefix = inferDatCheckoutPrefix(Object.keys(datFiles), knownPaths);

  for (const [datPath, fileData] of Object.entries(datFiles)) {
    const filename = matchDatSourcePath(datPath, knownPaths, checkoutPrefix);
    if (!(filename in datasetFiles)) {
      datasetFiles[filename] = { records: Object.create(null), source: sources[filename] };
    }

    const dest = datasetFiles[filename];
    dest.instances = mergeInstanceLists(dest.instances, fileData.instances);

    for (const [coverageType, datRecord] of Object.entries(fileData.records ?? {})) {
      if (!allowedCoverageTypes.has(coverageType)) continue;
      const existing = dest.records[coverageType];
      if (!existing || !existing?.lines?.some((line) => !!line)) dest.records[coverageType] = recordFromDat(filename, datRecord);
      else applyDatRecord(existing, datRecord, false);
    }
  }
}
