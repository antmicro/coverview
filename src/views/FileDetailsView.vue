<script setup>
import { useRoute, useRouter } from "vue-router";
import { store, availableCoverageTypes } from '../store.js';
import { computed, ref, onMounted } from 'vue';
import { clearHighlight, highlightByNum, scrollChunkIntoView } from "../codeViewerUtils.js";
import CodeSearchModel from '../CodeSearchModel.js';
import CodeSearch from '../components/CodeSearch.vue';

const props = defineProps({
  fileName: String,
})

/** @type {{value: File}} */
const file = computed(() => store.files[props.fileName]);
const coverageTypes = computed(() => availableCoverageTypes());
const route = useRoute();
const router = useRouter();
const code = file.value.source?.split('\n');
const originThreshold = 10;
const chunkSize = 200;
const visibleChunk = ref(1);
const observer = new IntersectionObserver((entries) => {
  const id = parseInt(entries.find(e => e.isIntersecting)?.target.id);
  if (id && id !== visibleChunk.value) visibleChunk.value = id;
});
let lineCount = 0;
const selectedLineStart = ref(0);

if (!store.hasSources) {
  lineCount = 0;
} else if (code) {
  lineCount = code.length;
} else {
  lineCount = Math.max(...(Object.values(file.value.records).map(x => x.lines.length)));
}

let chunks = Array(Math.ceil(lineCount / chunkSize));

function getColor(coverageData, threshold) {
  if (Object.keys(coverageData).length === 0) return "";
  const hitsAndTotal = Object.values(coverageData).reduce((acc, curr) => {return {hits: acc.hits + curr.hits, total: acc.total + curr.total}});

  if (hitsAndTotal.hits == hitsAndTotal.total) {
    return "dimmed-green";
  } else  if (hitsAndTotal.hits == 0) {
    return "dimmed-red";
  } else {
    if (store.metadata.warning_threshold === undefined) {
      return "dimmed-yellow";
    }
    if (threshold <= 1) {
        threshold = Math.floor(hitsAndTotal.total * threshold);
    }
    return hitsAndTotal.hits >= threshold ? "dimmed-green" : "dimmed-yellow";
  }
}

const lines = computed(() => Array.from(Array(lineCount).keys())
    .map(i => {
      const coverageData = {};
      let hasGroups = Object.create(null);
      let hitOrigins = []; // this is a bit hacky, as we only have "line" inside the loop
      // we use hitOrigins as the tests which hit the line since "source" is confusing
      for (const [type, record] of Object.entries(file.value.records)) {
        if (!store.hiddenCoverageTypes[type]) {
          const line = record.lines[i + 1];
          if (line) {
            hasGroups[type] = line.hasGroups;
            const [hits, total] = line.stats(store);
            let value = 0;
            if (line.hasGroups) {
              for (const group of Object.values(line.groups)) {
                for (const x of Object.values(group.subGroups)) {
                  value += x.value;
                }
              }
            } else {
              value = line.value;
            }
            coverageData[type] = { hits, total, value };
            hitOrigins = Array.from(line.sources);
          }
        }
      }
      const lineData = { n: i + 1, coverageData, color: getColor(coverageData, store.metadata.warning_threshold), showDetails: ref(''), showOrigins: ref(false), hitOrigins, hasGroups };
      if (code) lineData.code = code[i];
      return lineData;
    }));

const codeSearchModel = new CodeSearchModel(lines, chunkSize, visibleChunk);

const toggleDetails = (line, type) => {
  line.showDetails.value = (line.showDetails.value === type) ? '' : type;
}

const toggleLineOrigins = (line, value) => {
  line.showOrigins.value = value;
}

const highlightLine = e => {
  if (e.shiftKey) e.preventDefault();

  const lineNumber = parseInt(e.target.innerText);

  if (e.shiftKey && selectedLineStart.value !== null) {
    clearHighlight();
    const start = Math.min(selectedLineStart.value, lineNumber);
    const end = Math.max(selectedLineStart.value, lineNumber);

    router.replace({ query: { ...route.query, L: `${start}-${end}` } });

    for (let i = start; i <= end; i++) highlightByNum(i);
  } else {
    clearHighlight();
    selectedLineStart.value = lineNumber;
    const tr = e.target.closest('tr.line-row');
    if (tr) {
      tr.classList.add('highlighted-line');
    }
  }
};

onMounted(async () => {
  const main = document.querySelector('main');
  const scrollbar = document.querySelector('.sticky-scrollbar');

  if (main && scrollbar) {
    const updateWidth = () => scrollbar.style.setProperty('--scroll-width', `${main.scrollWidth - main.clientWidth}px`);
    const syncScroll = (e) => e.target === main ? scrollbar.scrollLeft = main.scrollLeft : main.scrollLeft = scrollbar.scrollLeft;

    updateWidth();
    main.addEventListener('scroll', syncScroll);
    scrollbar.addEventListener('scroll', syncScroll);
    new ResizeObserver(updateWidth).observe(main);
  }

  const lineParam = route.query.L;
  if (lineParam) {
    const rangeMatch = lineParam.match(/(\d+)-(\d+)/);
    const start = rangeMatch ? Number(rangeMatch[1]) : Number(lineParam);
    const end = rangeMatch ? Number(rangeMatch[2]) : null;

    selectedLineStart.value = start;

    // Scroll chunk marker into view to trigger virtual scrolling
    visibleChunk.value = scrollChunkIntoView(start, visibleChunk.value, chunkSize);

    // Wait for virtual scrolling to render, then highlight
    setTimeout(() => {
      clearHighlight();

      const lineEl = document.querySelector(`#L${start}`);
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const tr = lineEl.closest('tr.line-row');
        if (tr) {
          tr.classList.add('highlighted-line');
        }

        if (end) {
          for (let i = start + 1; i <= end; i++) {
            const tr = document.querySelector(`#L${i}`)?.closest('tr.line-row');
            if (tr) {
              tr.classList.add('highlighted-line');
            }
          }
        }
      }
    }, 200);
  }
  for (const el of chunks) observer.observe(el);
});
</script>

<template>
  <div class="wrapper">
    <main>
    <div v-if="!store.hasSources">NO SOURCE DATA IS AVAILABLE.</div>
    <div v-else-if="lines.length === 0">NO COVERAGE / SOURCE DATA FOR THIS FILE IS AVAILABLE.</div>
    <table v-else>
      <thead><tr><th></th><th v-for="name in coverageTypes">{{ name }} data</th><th></th><th>Source code</th></tr></thead>
      <tbody>
    <template v-for="i in Math.ceil(lines.length / chunkSize)">
      <tr :ref="el => chunks[i-1] = el" :id="i" style="height: 1px;"></tr>
      <template v-if="visibleChunk - 2 <=  i && visibleChunk + 1 >= i">
      <template v-for="(line, indexInChunk) in lines.slice(chunkSize * (i-1), chunkSize * i)" :key="line.n">
      <tr class="line-row">
          <td>
            <span style="margin-top: -300px; position: absolute;" :id="`L${line.n}`"></span>
            <RouterLink :to="{ query: { ...route.query, L: line.n } }" @click="highlightLine">{{ line.n }}</RouterLink>
          </td>
          <td v-for="type in coverageTypes">
            <span :class="`${line.color} padded`">
              <span style="padding-right: 5px; margin: auto 0; cursor: pointer; height: 18px; width: 18px; display: flex; align-items: center;" @click="toggleDetails(line, type)" v-if="line.coverageData[type] && !store.hiddenCoverageTypes[type] && line.hasGroups[type]">
                  <img class="icon" v-if="line.showDetails.value === type" src="../assets/minus.svg" alt="collapse"/>
                  <img class="icon" v-else src="../assets/plus.svg" alt="expand"/>
              </span>
              <span v-if="line.coverageData[type] && !store.hiddenCoverageTypes[type]">{{ line.coverageData[type].hits }}/{{ line.coverageData[type].total }}{{ store.showTotalHits ? ` (${line.coverageData[type].value})` : ""}}
                  <div class="remarks" @mouseleave="toggleLineOrigins(line, false)">
                      <ul>
                          <li class="remark" v-if="!line.showOrigins.value" v-for="origin in line.hitOrigins.slice(0, originThreshold)">{{origin}}</li>
                          <li class="remark" v-else v-for="origin in line.hitOrigins">{{origin}}</li>
                          <li class="remark" style="cursor: pointer;" @click="toggleLineOrigins(line, true)" v-if="!line.showOrigins.value && line.hitOrigins.length > originThreshold">Show more...</li>
                      </ul>
                  </div>
              </span>
            </span>
          </td>
          <td style="color: #52525b"><span :class="`${line.color} padded`">:</span></td>
          <td class="break">
            <span v-if="code" :class="`${line.color} padded`">
                <span v-for="(token) in codeSearchModel.getTokensForLine(indexInChunk, i)" :key="i" :class="{ 'search-result': token.highlight === 'result', 'highlighted': token.highlight === 'selected'}">{{ line.code.slice(token.start, token.end) }}</span>
            </span>
            <span v-else>NO LINE SOURCE AVAILABLE</span>
          </td>
        </tr>
        <template v-if="line.showDetails.value !== ''">
          <tr v-for="(g, gIndex) in file.records[line.showDetails.value]?.lines[line.n].groups" :key="`${line.n}-${gIndex}`" class="details-row">
            <td></td>
              <template v-for="type in coverageTypes" :key="`${line.n}-${type}-${gIndex}`">
                <td v-if="line.showDetails.value === type">
                  <div class="details-grid" style="grid-template-columns: repeat(2, min-content); padding-left: calc(20px - 0.3rem)">
                    <div v-for="datapoint in g.subGroups" :key="`${line.n}-${type}-${gIndex}-${datapoint.value}`" :title="[...datapoint.sources].join(' ')" :class="`${datapoint.value < 1 ? 'dimmed-red' : 'dimmed-green'} datapoint`" style="padding: 0rem 0.5rem">{{ datapoint.value }}</div>
                  </div>
                </td>
                <td v-else></td>
              </template>
            <td></td>
            <td class="break">
              <div class="details-grid">
                <div v-for="(datapoint, info) in g.subGroups" :key="`${line.n}-info-${gIndex}-${info}`" :class="`${datapoint.value < 1 ? 'dimmed-red' : 'dimmed-green'} datapoint`" style="padding: 0rem 0.5rem">{{ info }}</div>
              </div>
            </td>
          </tr>
        </template>
        </template>
        </template>
        <template v-else><tr style="height: 20px;"></tr></template>
        </template>
        </tbody>
      </table>
    </main>
    <div class="sticky-scrollbar"></div>
  </div>
  <CodeSearch :codeSearchModel />
</template>
<style scoped>
a.router-link-active {
  text-decoration: none;
  color: white;
}

.wrapper {
  position: relative;
  width: 100%;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

main {
  max-width: 100%;
}

@media (min-width: 1280px) {
  main {
    overflow: visible;
  }

  table {
    white-space: pre-wrap;
    width: 100%;
  }

  .sticky-scrollbar {
    display: none;
  }

  td.break {
    word-break: break-all;
    overflow-wrap: break-word;
  }
}

@media (max-width: 1279px) {
  main {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  main::-webkit-scrollbar {
    display: none;
  }

  table {
    table-layout: auto;
    white-space: nowrap;
    width: 100%;
  }

  .sticky-scrollbar {
    position: sticky;
    bottom: 0;
    width: 100%;
    height: 17px;
    overflow: auto hidden;
    z-index: 2;
    background: var(--bg-primary);
  }

  .sticky-scrollbar::before {
    content: '';
    display: block;
    width: calc(100% + var(--scroll-width, 0px));
    height: 1px;
  }
}
table {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  table-layout: auto;
  width: 100%;
}

th {
  text-align: left;
  color: #A1A1AA;
}

th, .padded {
  white-space: pre-wrap;
  padding: 0rem 0.3rem;
}

td:not(:has(.padded)) {
  white-space: pre-wrap;
  padding: 0 0 0 0.3rem;
}

td {
   vertical-align: top;
}

td:first-of-type {
  color: #71717A;
}

.padded {
  display: flex;
  align-items: center;
}

.datapoint:first-of-type {
  padding-top: 0.5rem;
}

.datapoint {
  white-space: normal;
  overflow-wrap: break-word;
}

.icon {
  width: 13px;
  height: 13px;
}

span .remarks {
    display: none;
}

span:hover .remarks {
    display: block;
    position: absolute;
    z-index: 9999 !important;
    left: var(--tooltip-left, auto);
    top: var(--tooltip-top, auto);
}

span:hover .remarks ul {
    width: max-content;
    position: relative;
     top: 0;
     left: 0;
     background-color: #000000;
     box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
     z-index: 100000;
}
span:hover .remarks ul .remark {
    width: 100%;
    display: flex;
    flex-direction: column;
    font-size: 0.675rem;
    background: #000000;
    padding: 0.2rem;
    border-right: 1px solid;
    border-left: 1px solid;
    text-align: left;
    border-bottom: 1px solid;
}

span:hover .remarks ul .remark:first-child {
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    border-top: 1px solid;
}

span:hover .remarks ul .remark:last-child {
    border-bottom: 1px solid;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
}

tr {
  position: relative;
}

.line-row.highlighted-line {
  background-color: rgba(var(--accent-primary-rgb, 0, 120, 215), 0.15);
  z-index: 1;
  filter: brightness(1.3);
  box-shadow: inset 0 1px 0 0 rgba(var(--accent-primary-rgb, 0, 120, 215), 0.4),
              inset 0 -1px 0 0 rgba(var(--accent-primary-rgb, 0, 120, 215), 0.4),
              inset 1px 0 0 0 rgba(var(--accent-primary-rgb, 0, 120, 215), 0.4),
              inset -1px 0 0 0 rgba(var(--accent-primary-rgb, 0, 120, 215), 0.4);
}

.search-result {
    background: #00d0c99a;
}

.highlighted {
  background: #00d0c9cc;
}

a.router-link-active {
  color: var(--text-muted);
}

.code {
    display: flex;
}
</style>
