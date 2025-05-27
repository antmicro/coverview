import { reactive, toRaw } from 'vue'
import { BlobReader, ZipReader, BlobWriter } from "@zip.js/zip.js";
import { XzReadableStream } from 'xz-decompress';
import { Record, parseInfo, parseDesc, unifySourcePath } from './parse';

/**
 * @typedef {{[coverageType: string]: Record}} Records
 * @typedef {{records: Records, source: string}} File
 * @typedef {{[filepath: string]: File}} Files
 * @typedef {{[dataset: string]: Files}} AllFiles
 * @typedef {{[path: string]: { [type: string]: { hits: number, total: number } }}} CoverageSummary
 * @typedef {{[dataset: string]: CoverageSummary}} AllSummaries
 */

export const store = reactive({
  /** @type {Files} */
  files: Object.create(null),
  /** @type {CoverageSummary} */
  summaries: Object.create(null),
  metadata: Object.create(null),
  loadedFromFile: false,
  hiddenCoverageTypes: Object.create(null),
  selectedDataset: "",
  tests: new Set()
});

const caches = reactive({
  /** @type {AllFiles} */
  files: Object.create(null),
  /** @type {AllSummaries} */
  summaries: Object.create(null),
});

/**
 * @param {{[filepath: string]: string}} inputFiles
 */
export function loadData(inputFiles) {
  console.time("File loading");

  unloadData();

  let config = {
    datasets: {
      dataset: { coverage: Object.keys(inputFiles).filter(x => x.endsWith('.info')) },
    },
  }
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

  const sources = Object.create(null);
  const sourcesFile = inputFiles['sources.txt'];
  if (sourcesFile) {
    const split = sourcesFile.split('### FILE: ');
    if (split.length > 1) {
      for (let i = 1; i < split.length; i++) {
        const nameContent = split[i].split('\n');
        const name = unifySourcePath(nameContent.shift());
        const content = nameContent.join('\n')
        sources[name] = content;
      }
    }
  }

  /** @type {AllFiles} */
  const allFiles = Object.create(null);
  for (const [dataset, layout] of Object.entries(config.datasets)) {
    for (let [coverageType, files] of Object.entries(layout)) {
      /** @type {{[filename: string]: Record}} */
      const records = Object.create(null);

      files = Array.isArray(files) ? files : [files];
      const infoFiles = files.filter(x => x.endsWith('.info'));
      const descFiles = files.filter(x => x.endsWith('.desc'));

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
        if (!descFile in infoFiles) {
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
    fillSummary("", (allSummaries[dataset] = Object.create(null)), files, Object.keys(config.datasets[dataset]));
    console.timeEnd(label);
  }

  // Set new data
  caches.files = allFiles;
  caches.summaries = allSummaries;
  store.metadata = config;
  selectDataset();

  console.timeEnd("File loading");
}

export function unloadData() {
  store.selectedDataset = "";
  store.files = Object.create(null);
  caches.files = Object.create(null);
  store.summaries = Object.create(null);
  caches.summaries = Object.create(null);
  store.metadata = Object.create(null);
  store.loadedFromFile = false;
  store.hiddenCoverageTypes = Object.create(null);
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
    parseInfo(name, content, records);

    // Recalculate summaries for the current dataset as values may have changed
    const newSummary = Object.create(null);
    fillSummary("", newSummary, store.files, availableCoverageTypes());
    store.summaries = (caches.summaries[store.selectedDataset] = newSummary);
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
  store.summaries = caches.summaries[dataset];
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
 * @param {CoverageSummary} summary
 * @param {Files} files
 * @param {string[]} coverageTypes
 */
function fillSummary(path, summary, files, coverageTypes) {
  if (pathType(path, files) === "file") {
    summary[path] = Object.fromEntries(coverageTypes.map(x => [x, { hits: 0, total: 0 }]));
    for (const [type, record] of Object.entries(files[path].records)) {
      const [hits, total] = record.stats;
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
    return Object.keys(store.metadata.datasets[store.selectedDataset]);
  }
  return []; // No coverage types available
}

export function getRateColor(rate, muted=false, grayscale=false) {
  let color = muted ? "#991b1b" : "#ef4444"; // red
  if (rate == 'N/A') {
    color = muted ? "#262626" : "#737373"; // neutral
  } else if (rate >= 80) {
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
  return (hitsAndTotals && hitsAndTotals.total > 0) ? parseFloat(((hitsAndTotals.hits/hitsAndTotals.total) * 100).toFixed(1)) : 'N/A';
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
    const data = await e.getData(new BlobWriter());
    files[e.filename] = await data.text();
  }
  zipReader.close();
  return files;
}
