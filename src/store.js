import { reactive, toRaw } from 'vue'

import { BlobReader, ZipReader, BlobWriter } from "@zip.js/zip.js";

export const store = reactive({
  files: {},
  loadedFromFile: false, // data was loaded from file
  types: {},             // available coverage types
  modules: {},           // coverage data aggregated by module
  metadata: {},          // other data
  selected_dataset: ''   // the currently selected dataset
})

export function getCoverage(module, file) {
  if (module && file) {
    const fileObject = toRaw(store.modules)[module].files[file];
    const coverage = {};
    for (const type of Object.keys(store.types)) {
        coverage[type] = countCoverageForFile(fileObject, type);
    }
    return coverage;
  } else if (module) {
    return toRaw(store.modules[module].coverage);
  } else {
    const coverage_totals = {};
    for (const type of Object.keys(store.types)) {
      coverage_totals[type] = { hits: 0, total: 0 };
      for (const [name, m] of Object.entries(store.modules)) {
        coverage_totals[type].hits += toRaw(m).coverage[type].hits;
        coverage_totals[type].total += toRaw(m).coverage[type].total;
      }
    }
    return coverage_totals;
  }
}

import { parseInfo } from "./parse.js";

export function countCoverageForLine(line) { // type not needed, since we're in specific type
  const ret = { hits: 0, total: 0 };
  if (line.groups) {
    // if there are groups in this line, count fields and the values
    for (const g of Object.values(line.groups)) {
      ret.hits += g.filter(x => x.value > 0).length;
      ret.total += g.length;
    }
  } else {
    ret.hits = (line.value > 0) ? 1 : 0;
    ret.total = 1;
  }
  return ret;
}

function countCoverageForFile(file, type) {
  const ret = { hits: 0, total: 0 };
  const cov = file.coverage[type];
  if (cov && cov.lines) {
    for (const line of Object.values(cov.lines)) {
      const hitsAndTotal = countCoverageForLine(line);
      ret.hits += hitsAndTotal.hits;
      ret.total += hitsAndTotal.total;
    }
  }
  return ret;
}


export function loadData(inputFiles) {
  let config = {};
  try {
    const configFile = inputFiles['config.json'];
    if (!configFile) {
      throw new Error('The archive does not have a config.json file, no data will be loaded.');
    }
    config = JSON.parse(configFile);
    if (!(config?.datasets) || Object.keys(config.datasets).length < 1) {
      throw new Error('The config is malformed, does not contain a "datasets" field with at least one dataset.');
    }
  }
  catch (e) {
    store.types = {};
    store.modules = {};
    console.error(e);
    return;
  }

  const sources = {};
  const sourcesFile = inputFiles['sources.txt'];
  if (sourcesFile) {
    const split = sourcesFile.split('### FILE: ');
    if (split.length > 1) {
        for (let i = 1; i < split.length; i++) {
            const nameContent = split[i].split('\n');
            const name = nameContent.shift();
            const content = nameContent.join('\n')
            sources[name] = content;
        }
    }
  }

  if (!(store.selected_dataset in config.datasets)) {
    const firstDataset = Object.keys(config.datasets)[0]
    store.selected_dataset = firstDataset;
    sessionStorage.setItem("dataset", firstDataset);
  }

  const layout = config.datasets[store.selected_dataset];
  const types = Object.keys(layout);

  const metadata = config;

  const coverage = {};
  for (let [k, v] of Object.entries(layout)) {
    if (!inputFiles[v]) {
      store.types = {};
      store.modules = {};
      console.error(`file ${v} was not loaded! Check if it's in the package.`);
      return;
    }
    coverage[k] = parseInfo(inputFiles[v]);
  }

  const filenames = Array.from(
    new Set(types.flatMap(t => Object.keys(coverage[t]))),
  );

  const files = {};
  for (const t of Object.keys(coverage)) {
    for (const f of Object.keys(coverage[t])) {
      if (!(f in files)) files[f] = {coverage: {}};
      files[f].coverage[t] = { lines: coverage[t][f].lines };
      if (f in sources) {
        files[f].source = sources[f];
      }
    }
  }

  const modules = Object.fromEntries(
    Array.from(
      new Set(filenames.map((n) => n.split("/").slice(0, -1).join("/"))),
    ).map((name) => [
      name,
      {
        files: Object.fromEntries(
          Object.entries(files)
            .filter(([k,_]) => k.split("/").slice(0, -1).join("/") === name)
            .map(([k,v]) => [k.split("/").at(-1), { ...v, contents: null }]),
        ),
        coverage: {}
      },
    ]),
  );

  // count coverages for modules; for files it's trivial to count on the fly, total is also trivial once you have modules
  for (const type of types) {
    store.types[type] = { visibility: true };
    for (const [name, m] of Object.entries(modules)) {
      let hits = 0;
      let total = 0;
      for (const file of Object.values(m.files)) {
        const fileResults = countCoverageForFile(file, type);
        hits += fileResults.hits;
        total += fileResults.total;
      }
      modules[name].coverage[type] = { hits: hits, total: total }
    }
  }

  store.modules = modules;
  store.metadata = metadata;
}

export function getRateColor(rate, muted=false) {
  if (rate == 'N/A') return muted ? "#262626" : "#737373"; // neutral
  if (rate >= 80) return muted ? "#166534" : "#22c55e"; // green
  if (rate >= 60) return muted ? "#854d0e" : "#eab308"; // yellow
  if (rate >= 1) return muted ? "#9a3412" : "#f97316"; // orange
  return muted ? "#991b1b" : "#ef4444"; // red
}

export function getRate(hitsAndTotals) {
  return (hitsAndTotals && hitsAndTotals.total > 0) ? parseFloat(((hitsAndTotals.hits/hitsAndTotals.total) * 100).toFixed(1)) : 'N/A';
}

export async function decompress(zipFile) {
  const zipFileReader = new BlobReader(await zipFile);
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
