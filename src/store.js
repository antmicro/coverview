import { reactive, toRaw, ref } from 'vue'
import { BlobReader, ZipReader, Uint8ArrayWriter } from "@zip.js/zip.js";
import { XzReadableStream } from 'xz-decompress';
import { Record, parseInfo, parseDesc, unifySourcePath, parseTable, applyDatCoverage } from './parse';
import router from './router/index.js'
import initDatParser, { DatParser } from './dat_parser/dat_parser.js'

/**
 * @typedef {{[coverageType: string]: Record}} Records
 * @typedef {{records: Records, source: string, instances?: string[]}} File
 * @typedef {{[filepath: string]: File}} Files
 * @typedef {{[dataset: string]: Files}} AllFiles
 * @typedef {{[path: string]: { [type: string]: { hits: number, total: number } }}} CoverageSummary
 * @typedef {{[dataset: string]: CoverageSummary}} AllSummaries
 * @typedef {{[path: string]: Record}} Tables
 * @typedef {{[dataset: string]: Tables}} AllTables
 */

export const store = reactive({
  /** @type {Files} */
  files: Object.create(null),
  /** @type {CoverageSummary} */
  summaries: Object.create(null),
  metadata: Object.create(null),
  dataLoaded: false,
  loadedFromFile: false,
  testsAsTotal: false,
  showTotalHits: ref(false),
  hiddenCoverageTypes: Object.create(null),
  selectedDataset: "",
  selectedInstance: "",
  tests: new Set(),
  hasSources: false,
  showSearchWindow: ref(false),
  /** @type {Tables} */
  tables: Object.create(null),
});

const caches = reactive({
  /** @type {AllFiles} */
  files: Object.create(null),
  /** @type {AllTables} */
  tables: Object.create(null),
  /** @type {AllSummaries} */
  summaries: Object.create(null),
});

export function parse_warning_threshold(value) {
    if(value.endsWith("%")){
       value = parseFloat(value.slice(0, -1));
       if (value !== NaN) {
         value = value / 100;
       }
    } else {
       value = parseFloat(value);
    }

    if (value === NaN) {
      alert("Invalid config: warning_threshold is not an number")
      return;
    }
    return value;
  }

/**
 * @param {{[filepath: string]: string | Uint8Array}} inputFiles
 */
function selectFiles(inputFiles) {
  const names = Object.keys(inputFiles);
  const config = inputFiles["config.json"]
    ? JSON.parse(inputFiles["config.json"])
    : Object.create(null);
  const hasConfig = Object.keys(config).length > 0;
  if (
    !hasConfig &&
    names.some((n) => n.endsWith(".info")) &&
    names.some((n) => n.endsWith(".dat"))
  ) {
    throw new Error("Both .info and .dat files provided.");
  }
  const selected = hasConfig
    ? ["config.json"]
    : names.filter((n) => /^[^/]*\.(info|desc|dat)$/.test(n));

  if ("dat" in config) {
    if (typeof config.dat !== "string") {
      throw new Error(
        `Value '${config.dat}' linked as 'dat' in config.json is not a string.`,
      );
    }

    const beforeSelect = selected.length;

    if (config.dat.endsWith(".json")) {
      selected.push(config.dat);
    } else {
      selected.push(
        ...names.filter(
          (n) =>
            n.startsWith(config.dat.replace(/\/$/, "") + "/") &&
            n.endsWith(".dat"),
        ),
      );
    }

    if (beforeSelect === selected.length) {
      throw new Error(
        `'${config.dat}' linked as 'dat' in config.json is neither a .json file nor a directory with .dat files.`,
      );
    }
  }

  const datasetFiles = Object.values(config.datasets ?? {}).flatMap((d) =>
    Object.values(d).flat(),
  );
  const allowed = "dat" in config ? [".desc"] : [".desc", ".info"];
  const disallowed = datasetFiles.find(
    (f) => !allowed.some((ext) => f.endsWith(ext)),
  );
  if (disallowed) {
    throw new Error(
      `Only ${allowed.join(" and ")} files are allowed in 'datasets' ${"dat" in config ? "when" : "without"} 'dat', found '${disallowed}' in config.json.`,
    );
  }

  selected.push(...datasetFiles, "logo.svg", "sources.txt");
  return Object.fromEntries(
    selected.filter((n) => n in inputFiles).map((n) => [n, inputFiles[n]]),
  );
}


/**
 * @param {{[filepath: string]: string | Uint8Array}} inputFiles
 */
export async function loadData(inputFiles, fromUploadedFile = false) {
  console.time("File loading");

  const datNoConfig = !inputFiles['config.json'] && Object.keys(inputFiles).some(x => x.endsWith('.dat'));
  const otherExt = 'dat' in store.metadata ? '.info' : '.dat';
  if (store.dataLoaded && !inputFiles['config.json'] && Object.keys(inputFiles).some(x => x.endsWith(otherExt))) {
    throw new Error(`Cannot load ${otherExt} files: the loaded data comes from ${otherExt === '.dat' ? '.info' : '.dat'} files.`);
  }

  unloadData();
  inputFiles = selectFiles(inputFiles);

  let config = datNoConfig
    ? { datasets: { dataset: { line: [], branch: [], toggle: [], expr: [] } }, dat: '' }
    : { datasets: { dataset: { coverage: Object.keys(inputFiles).filter(x => x.endsWith('.info')) } } };

  const configSrc = inputFiles['config.json'];
  if (configSrc) {
    config = JSON.parse(configSrc);
  }
  if (Object.keys(config?.datasets ?? {}).length < 1) {
    throw new Error('The config is malformed, does not contain a "datasets" field with at least one dataset.');
  }

  if (config?.additional) {
    config._additional = JSON.stringify(config.additional, null, '  ');
  }

  if ('warning_threshold' in config) {
    config.warning_threshold = parse_warning_threshold(config.warning_threshold);
  }

  const sources = Object.create(null);
  const sourcesFile = inputFiles['sources.txt'];
  if (sourcesFile) {
    const split = sourcesFile.split('### FILE: ');
    if (split.length > 1) {
      for (let i = 1; i < split.length; i++) {
        const nameContent = split[i].split(/\r?\n/);
        const name = unifySourcePath(nameContent.shift());
        const content = nameContent.join('\n')
        sources[name] = content;
      }
    }
  }

  const tableCoverageType = config['table_coverage'];

  /** @type {AllFiles} */
  const allFiles = Object.create(null);
  /** @type {AllTables} */
  const allTables = Object.create(null);

  const datFilesByDataset = collectDatFiles(config.datasets, inputFiles);
  const preparsedDatByDataset = collectPreparsedDatFiles(config);

  await applyDatFiles(inputFiles, allFiles, sources, datFilesByDataset, preparsedDatByDataset, new Set(Object.values(config.datasets).flatMap(d => Object.keys(d))));

  for (const [dataset, layout] of Object.entries(config.datasets)) {
    for (let [coverageType, files] of Object.entries(layout)) {
      files = Array.isArray(files) ? files : [files];
      const infoFiles = files.filter(x => x.endsWith('.info'));
      const descFiles = files.filter(x => x.endsWith('.desc'));

      // Parse this INFO file as a table
      if (typeof tableCoverageType === 'string' && coverageType === tableCoverageType) {
        if (!(dataset in allTables)) {
          allTables[dataset] = Object.create(null);
        }

        for (const infoFile of infoFiles) {
          const label = `Loading .info file: ${infoFile} (table)`;
          console.time(label);
          parseTable(infoFile, inputFiles[infoFile], allTables[dataset]);
          console.timeEnd(label);
        }
        // Fallthrough
      }

      /** @type {{[filename: string]: Record}} */
      const records = Object.create(null);
      for (const [filename, file] of Object.entries(allFiles[dataset] ?? {})) {
        if (file.records[coverageType]) {
          records[filename] = file.records[coverageType];
        }
      }

      for (const infoFile of infoFiles) {
        if (!(infoFile in inputFiles)) {
          console.error(`File does not exist: ${infoFile}`);
          return;
        }

        const label = `Loading .info file: ${infoFile}`;
        console.time(label);
        parseInfo(infoFile, inputFiles[infoFile], records);
        console.timeEnd(label);
      }

      for (const descFile of descFiles) {
        if (!(descFile in inputFiles)) {
          console.error(`File does not exist: ${descFile}`);
          return;
        }

        const label = `Loading .desc file: ${descFile}`;
        console.time(label);
        store.tests = toRaw(store.tests).union(parseDesc(descFile, inputFiles[descFile], records));
        console.timeEnd(label);
      }

      if (!(dataset in allFiles)) {
        allFiles[dataset] = Object.create(null);
      }

      for (const [filename, record] of Object.entries(records)) {
        if (!(filename in allFiles[dataset])) {
          allFiles[dataset][filename] = {
            records: Object.create(null),
            source: sources[filename],
          };
        }
        allFiles[dataset][filename].records[coverageType] = record;
      }
    }
  }

  if (Object.values(allFiles).every(value => Object.keys(value).length === 0)) {
    alert(`No dataset found. Is this a valid Coverview archive?`);
    return;
  }

  /** @type {AllSummaries} */
  const allSummaries = Object.create(null);
  for(const [dataset, files] of Object.entries(allFiles)) {
    const label = `Calculating summaries for dataset: ${dataset}`
    console.time(label);
    allSummaries[dataset] = Object.create(null);
    fillSummary("", allSummaries[dataset], files, datasetCoverageTypes(config.datasets[dataset]));
    console.timeEnd(label);
  }

  // Set initial query
  router.isReady().then(() => {
    // When uploading new dataset, we want to reset query params and use metadata.
    // Otherwise, we prefer current query params to enable URLs to produce reproducible views.
    let initialQuery = fromUploadedFile ? {} : Object.assign({}, router.currentRoute.value.query);

    function get_bool(query_value) {
      if (query_value !== undefined) {
        if (query_value === 'false') {
          return false;
        } else if (query_value === 'true') {
          return true;
        }
        console.log(`Query value can't be cast to bool: ${query_value}`)
      }
      // Invalid values shouldn't be used.
      return undefined;
    }

    initialQuery.flatFileList = get_bool(initialQuery.flatFileList) ?? (config.flat_file_list ?? false);
    initialQuery.hideNotCovered = get_bool(initialQuery.hideNotCovered) ?? (config.hide_not_covered ?? false);
    initialQuery.testsAsTotal = get_bool(initialQuery.testsAsTotal) ?? (config.tests_as_total ?? false);
    store.testsAsTotal = initialQuery.testsAsTotal;
    initialQuery.warningThreshold ??= config.warning_threshold ?? undefined;
    router.push({ query: initialQuery });
  });
  console.log("router init config is now set");

  // Set new data
  caches.files = allFiles;
  caches.tables = allTables;
  caches.summaries = allSummaries;
  store.metadata = config;
  store.hasSources = !!sourcesFile;
  selectDataset();
  if (!fromUploadedFile) {
    const instance = router.currentRoute.value.query.instance;
    if (typeof instance === 'string' && instance) selectInstance(instance);
  }
  store.dataLoaded = true;

  console.timeEnd("File loading");
}

/**
 * Collect `.dat` files listed in the dataset layout, then assign leftover
 * archive `.dat` files to a `verilator` dataset (or the only dataset).
 *
 * TODO)) Make sure that we only respect the config. Don't automatically assign the leftover .dat files to "verilator"
 *
 * @param {{[dataset: string]: {[type: string]: string | string[]}}} datasets
 * @param {{[filepath: string]: unknown}} inputFiles
 * @returns {{[dataset: string]: string[]}}
 */
function collectDatFiles(datasets, inputFiles) {
  /** @type {{[dataset: string]: string[]}} */
  const byDataset = Object.create(null);
  const assigned = new Set();

  for (const [dataset, layout] of Object.entries(datasets ?? {})) {
    const listed = [];
    for (const value of Object.values(layout ?? {})) {
      const files = Array.isArray(value) ? value : [value];
      for (const file of files) {
        if (typeof file === 'string' && file.endsWith('.dat')) {
          listed.push(file);
          assigned.add(file);
        }
      }
    }
    if (listed.length > 0) {
      byDataset[dataset] = listed;
    }
  }

  const leftover = Object.keys(inputFiles).filter((name) => name.endsWith('.dat') && !assigned.has(name));
  if (leftover.length > 0) {
    const target = pickFallbackDataset(datasets);
    if (target) {
      byDataset[target] = [...(byDataset[target] ?? []), ...leftover];
    }
  }

  return byDataset;
}

const pickFallbackDataset = (datasets) => {
  const names = Object.keys(datasets ?? {});
  return names.includes('verilator') ? 'verilator' : names.length === 1 ? names[0] : null;
};

/** Assign config.json's top-level `dat` (a `dat_parser` CLI export) to a dataset. */
function collectPreparsedDatFiles(config) {
  if (typeof config?.dat !== 'string' || !config.dat.endsWith('.json')) return Object.create(null);
  const target = pickFallbackDataset(config.datasets);
  return target ? { [target]: config.dat } : Object.create(null);
}

export function unloadData() {
  store.selectedDataset = "";
  store.selectedInstance = "";
  store.files = Object.create(null);
  store.tables = Object.create(null);
  store.summaries = Object.create(null);
  caches.files = Object.create(null);
  caches.tables = Object.create(null);
  caches.summaries = Object.create(null);
  store.metadata = Object.create(null);
  store.loadedFromFile = false;
  store.hiddenCoverageTypes = Object.create(null);
  store.tests = new Set();
  store.dataLoaded = false;
}

/**
 * @param {string} type
 * @param {string} name
 * @param {string} content
 */
export function loadAdditionalFile(type, name, content) {
  /** @type {{[path: string]: Record}} */
  const records = Object.fromEntries(Object.entries(store.files)
    .map(entry => [entry[0], entry[1].records[type]])
    .filter(entry => entry[1]));

  if (name.endsWith(".info")) {
    if ('dat' in store.metadata) {
      console.error(`Cannot load '${name}': the loaded data already comes from .dat files.`);
      return;
    }

    parseInfo(name, content, records);

    // Recalculate summaries for the current dataset as values may have changed
    const newSummary = Object.create(null);
    fillSummary("", newSummary, store.files, availableCoverageTypes());
    caches.summaries[store.selectedDataset] = newSummary;
    applySummariesForSelection();
  } else if (name.endsWith(".desc")) {
    store.tests = toRaw(store.tests).union(parseDesc(name, content, records));
  } else {
    alert(`Unsupported file format for: ${name}`);
  }
}

/**
 * @param {string?} dataset
 */
export function selectDataset(dataset = null) {
  const datasets = store?.metadata?.datasets ?? {};
  if (!dataset || !(dataset in datasets)) {
    // Default to the first dataset if non provided or the provided value is invalid
    dataset = Object.keys(datasets)[0];
  }

  if (!dataset) {
    return;
  }

  store.selectedDataset = dataset;
  store.files = caches.files[dataset];
  store.tables = caches.tables[dataset];
  if (store.selectedInstance && !instanceExists(store.selectedInstance)) store.selectedInstance = "";
  applySummariesForSelection();
}

/**
 * Restrict coverage totals to one design hierarchy, or `""` for the aggregate.
 *
 * @param {string?} instance
 */
export function selectInstance(instance) {
  if (instance && !instanceExists(instance)) store.selectedInstance = "";
  store.selectedInstance = instance;
  applySummariesForSelection();
}

const instanceExists = (instance, files = store.files) => Object.values(files ?? {}).some((file) => file.instances?.includes(instance));

function applySummariesForSelection() {
  if (!store.selectedInstance) {
    store.summaries = caches.summaries[store.selectedDataset];
    return;
  }

  const summary = Object.create(null);
  fillSummary("", summary, store.files, availableCoverageTypes());
  store.summaries = summary;
}

export function availableInstances(path = "") {
  const instances = new Set();
  for (const [filePath, file] of Object.entries(store.files ?? {})) {
    if (path && filePath !== path && !filePath.startsWith(`${path}/`)) {
      continue;
    }
    for (const instance of file.instances ?? []) {
      instances.add(instance);
    }
  }
  return Array.from(instances).sort();
}

/**
 * @param {string} path
 * @param {Files?} files
 * @returns {string[]}
 */
export function getPathChildren(path, files = null) {
  if (!files) {
    files = store.files;
  }

  if (!files) {
    return [];
  }

  const results = new Set();
  const pathComponents = path.split('/');
  if (!pathComponents.at(-1)) {
    pathComponents.pop(); // Remove empty strings at the end
  }

  for (const file of Object.keys(files)) {
    const components = file.split('/');
    if (pathComponents.length === 0) {
      results.add(components[0]);
      continue;
    }

    if (components.length <= pathComponents.length) {
      // Only longer paths can be children of `path`
      continue;
    }

    if (pathComponents.every((part, i) => part === components[i])) {
      results.add(components[pathComponents.length]);
    }
  }

  return Array.from(results);
}

/**
 * @param {string} path
 * @param {Files?} files
 * @returns {"file" | "dir" | null}
 */
export function pathType(path, files = null) {
  if (!files) {
    files = store.files;
  }

  if (path == null || !files) {
    return null;
  }

  // Check if the path is a file
  if (path in files) {
    return "file";
  }

  // Check if the path is a directory
  const pathComponents = path.split('/');
  if (!path.at(-1)) {
    pathComponents.pop(); // Remove empty strings at the end
  }

  for (const file of Object.keys(files)) {
    const components = file.split('/');
    if (components.length < pathComponents.length) {
      continue;
    }

    if (pathComponents.every((part, i) => part === components[i])) {
      return "dir";
    }
  }

  return null;
}

/**
 * @param {string} path
 * @param {Tables?} tables
 * @returns {boolean}
 */
export function hasTableForFile(path, tables = null) {
  if (!tables) {
    tables = store?.tables;
  }
  return Object.hasOwn(tables ?? {}, path)
}

/**
 * @param {string} path
 * @param {CoverageSummary} summary
 * @param {Files} files
 * @param {string[]} coverageTypes
 */
function fillSummary(path, summary, files, coverageTypes) {
  if (pathType(path, files) === "file") {
    summary[path] = Object.fromEntries(coverageTypes.map(x => [x, { hits: 0, total: 0 }]));
    for (const [type, record] of Object.entries(files[path].records)) {
      const [hits, total] = record.stats(store);
      summary[path][type].hits += hits;
      summary[path][type].total += total;
    }
    return;
  }

  // Get full paths to each child
  const children = getPathChildren(path, files).map(x => path.length === 0 ? x : `${path}/${x}`);
  for (const child of children) {
    fillSummary(child, summary, files, coverageTypes);
  }

  summary[path] = Object.fromEntries(coverageTypes.map(x => [x, { hits: 0, total: 0 }]));
  for (const child of children) {
    for (const [type, data] of Object.entries(summary[child])) {
      summary[path][type].hits += data.hits;
      summary[path][type].total += data.total;
    }
  }
}

export function availableCoverageTypes() {
  if (store.metadata?.datasets && store.metadata.datasets[store.selectedDataset]) {
    return datasetCoverageTypes(store.metadata.datasets[store.selectedDataset]);
  }
  return []; // No coverage types available
}

const datasetCoverageTypes = (layout) => Object.keys(layout ?? {}).filter((key) => key !== 'dat');

/**
 * @param {{[filepath: string]: string | Uint8Array}} inputFiles
 * @param {AllFiles} allFiles
 * @param {{[path: string]: string}} sources
 * @param {{[dataset: string]: string[]}} datFilesByDataset
 * @param {{[dataset: string]: string}} preparsedDatByDataset
 */
async function applyDatFiles(inputFiles, allFiles, sources, datFilesByDataset, preparsedDatByDataset, allowedCoverageTypes) {
  for (const [dataset, jsonFile] of Object.entries(preparsedDatByDataset)) {
    if (!(jsonFile in inputFiles)) {
      console.error(`File does not exist: ${jsonFile}`);
      continue;
    }
    if (!(dataset in allFiles)) allFiles[dataset] = Object.create(null);

    const label = `Loading pre-parsed .dat export for dataset: ${dataset}`;
    console.time(label);
    const exported = JSON.parse(inputFiles[jsonFile]);
    applyDatCoverage(exported, allFiles[dataset], sources, allowedCoverageTypes);
    console.timeEnd(label);
  }

  // Skip the WASM path for datasets already covered above.
  const datasetsWithDat = Object.entries(datFilesByDataset)
    .filter(([dataset, files]) => files.length > 0 && !(dataset in preparsedDatByDataset));
  if (datasetsWithDat.length === 0) return;

  if (DatParser.disabled) {
    console.error('.dat files found but this build has no DAT parser.');
    return;
  }

  try {
    await initDatParser();
  } catch (error) {
    console.error('Failed to initialize DAT parser; instance data will be unavailable.', error);
    return;
  }

  for (const [dataset, datFiles] of datasetsWithDat) {
    if (!(dataset in allFiles)) allFiles[dataset] = Object.create(null);

    const label = `Loading .dat files for dataset: ${dataset}`;
    console.time(label);
    const parser = new DatParser();
    for (const datFile of datFiles) {
      if (!(datFile in inputFiles)) {
        console.error(`File does not exist: ${datFile}`);
        continue;
      }
      const fileLabel = `Loading .dat file: ${datFile}`;
      console.time(fileLabel);
      const content = inputFiles[datFile];
      if (content instanceof Uint8Array) parser.parseBytes(datFile, content);
      else parser.parse(datFile, content);
      console.timeEnd(fileLabel);
    }

    const exported = parser.export();
    parser.free();
    applyDatCoverage(exported, allFiles[dataset], sources, allowedCoverageTypes);
    console.timeEnd(label);
  }
}

export function getRateColor(rate, muted=false, grayscale=false) {
  let color = muted ? "#991b1b" : "#ef4444"; // red
  if (rate == 'N/A') {
    color = muted ? "#262626" : "#737373"; // neutral
  } else if (rate >= 80 || rate == '~100') {
    color = muted ? "#166534" : "#22c55e"; // green
  } else if (rate >= 60) {
    color = muted ? "#854d0e" : "#eab308"; // yellow
  } else if (rate >= 1) {
    color = muted ? "#9a3412" : "#f97316"; // orange
  }
  if (grayscale) {
    let red = parseInt(color.substring(1,3),16);
    let green = parseInt(color.substring(3,5),16);
    let blue =  parseInt(color.substring(5,7),16);
    let gray = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
    if (gray > 255) gray = 255;
    let gray_s = gray.toString(16);
    if (gray_s.length == 1) gray_s = "0" + gray_s;
    color = "#" + gray_s + gray_s + gray_s;
  }
  return color;
}

export function getRate(hitsAndTotals) {
  if (!hitsAndTotals || hitsAndTotals.total <= 0) return 'N/A';
  const ratio = hitsAndTotals.hits / hitsAndTotals.total;
  return ratio < 0.9995 || ratio === 1 ? parseFloat((ratio * 100).toFixed(1)) : '~100';
}

// takes a ReadableStream - a response.body or file.stream() - and decompresses it
export async function decompress(archive, extension="zip") {
  let blob = null;
  if (extension == "xz") {
    blob = new Response(new XzReadableStream(archive)).blob();
  } else {
    blob = new Response(archive).blob();
  }
  const zipFileReader = new BlobReader(await blob);
  const zipReader = new ZipReader(zipFileReader);
  const entries = await zipReader.getEntries();

  const files = {};
  for (const e of entries) {
    if (e.directory) continue;
    const bytes = await e.getData(new Uint8ArrayWriter());
    files[e.filename] = e.filename.endsWith('.dat') ? bytes : new TextDecoder().decode(bytes);
  }
  zipReader.close();
  return files;
}
