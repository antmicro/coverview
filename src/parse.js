import { store } from './store'

class SubGroup {
  constructor() {
    this.value = 0;
    /** @type {Set<string>} */
    this.sources = new Set();
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
  get stats() {
    let total = 0;
    let hits = 0;
    for (const x of Object.values(this.subGroups)) {
      hits += x.value > 0 ? 1 : 0;
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

  /** @type {[hits: number, total: number]} */
  get stats() {
    let hits = 0;
    let totals = 0;
    if (this.hasGroups) {
      for (const group of Object.values(this.groups)) {
        const [groupHits, groupTotals] = group.stats;
        hits += groupHits;
        totals += groupTotals;
      }
    } else if (store.metadata.tests_as_total === true && store.tests.size !== 0 && this.sources) {
      hits = this.sources.size;
      totals = store.tests.size;
    } else {
      hits = this.value > 0 ? 1 : 0;
      totals = 1;
    }
    return [hits, totals];
  }

  /** @type {boolean} */
  get hasGroups() {
    return !!this.groups;
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
  get stats() {
    let hits = 0;
    let total = 0;
    for (const line of this.lines) {
      if (!line) continue;

      const [lineHits, lineTotal] = line.stats;
      hits += lineHits;
      total += lineTotal;
    }
    return [hits, total];
  }
}

/**
 * @param {string} content
 * @param {string?} namePrefix
 * @returns {Generator<[name: string, lines: [prefix: string, data: string][]]>}
 */
function *getRecords(filename, content, namePrefix = null) {
  let lines = [];
  let name = "";
  for (let line of content.split('\n')) {
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

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      console.error(`The ${filename} file seems malformed, encountered line without any colon other than "end_of_record": ${line}`);
      continue;
    }

    const prefix = line.slice(0, separatorIndex);
    const content = line.slice(separatorIndex + 1);

    if (prefix === namePrefix) {
      name = unifySourcePath(content);
      continue;
    }

    lines.push([prefix, content]);
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
