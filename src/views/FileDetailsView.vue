<script setup>
import { useRoute, useRouter } from "vue-router";
import { store, availableCoverageTypes } from '../store.js';
import { computed, ref, onMounted } from 'vue';

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
            const [hits, total] = line.stats;
            coverageData[type] = { hits, total };
            hitOrigins = Array.from(line.sources);
          }
        }
      }
      const lineData = { n: i + 1, coverageData, color: getColor(coverageData, store.metadata.warning_threshold), showDetails: ref(''), showOrigins: ref(false), hitOrigins, hasGroups };
      if (code) lineData.code = code[i];
      return lineData;
    }));

const toggleDetails = (line, type) => {
  line.showDetails.value = (line.showDetails.value === type) ? '' : type;
}

const toggleLineOrigins = (line, value) => {
  line.showOrigins.value = value;
}

const setDecreasingZIndex = (lineNumber, element) => {
  const baseZIndex = 1000;
  element.style.zIndex = baseZIndex - lineNumber;
};

const clearHighlight = () => document.querySelectorAll('.highlighted-line').forEach(el => el.classList.remove('highlighted-line'));

const highlightLine = e => { 
  if (e.shiftKey) e.preventDefault();
  
  const lineNumber = parseInt(e.target.innerText);
  
  if (e.shiftKey && selectedLineStart.value !== null) {
    clearHighlight();
    const start = Math.min(selectedLineStart.value, lineNumber);
    const end = Math.max(selectedLineStart.value, lineNumber);
    
    router.replace({ hash: `#L${start}-L${end}`, query: route.query });
    
    for (let i = start; i <= end; i++) {
      const el = document.querySelector(`#L${i}`);
      if (el) {
        const tr = el.closest('tr.line-row');
        if (tr) {
          tr.classList.add('highlighted-line');
          setDecreasingZIndex(i, tr);
        }
      }
    }
  } else {
    clearHighlight();
    selectedLineStart.value = lineNumber;
    const tr = e.target.closest('tr.line-row');
    if (tr) {
      tr.classList.add('highlighted-line');
      setDecreasingZIndex(lineNumber, tr); 
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

  if (route.hash) {
    clearHighlight();
    
    const rangeMatch = route.hash.match(/#L(\d+)-L(\d+)/);
    if (rangeMatch) {
      const [_, start, end] = rangeMatch.map(Number);
      selectedLineStart.value = start;
      
      document.querySelector(`#L${start}`)?.scrollIntoView({ behavior: 'smooth' });
      
      for (let i = start; i <= end; i++) {
        const tr = document.querySelector(`#L${i}`)?.closest('tr.line-row');
        if (tr) {
          tr.classList.add('highlighted-line');
          setDecreasingZIndex(i, tr); 
        }
      }
    } else {
      const lineMatch = route.hash.match(/#L(\d+)/);
      if (lineMatch) {
        const lineNum = Number(lineMatch[1]);
        const lineEl = document.querySelector(`#L${lineNum}`);
        if (lineEl) {
          lineEl.scrollIntoView({ behavior: 'smooth' });
          const tr = lineEl.closest('tr.line-row');
          if (tr) {
            tr.classList.add('highlighted-line');
            setDecreasingZIndex(lineNum, tr);
            selectedLineStart.value = lineNum;
          }
        }
      }
    }
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
      <template v-for="(line) in lines.slice(chunkSize * (i - 1), chunkSize * i)" :key="line.n">
      <template v-if="Math.abs(visibleChunk - i) <= 1">
      <tr>
          <td>
            <span style="margin-top: -300px; position: absolute;" :id="`L${line.n}`"></span>
            <RouterLink :to="{ hash: `#L${line.n}`, query: route.query }" @click="highlightLine">{{ line.n }}</RouterLink>
          </td>
          <td v-for="type in coverageTypes">
            <span :class="`${line.color} padded`">
              <span style="padding-right: 5px; padding-bottom: 3px; cursor: pointer; height: 18px; width: 18px; display: flex; align-items: center;" @click="toggleDetails(line, type)" v-if="line.coverageData[type] && !store.hiddenCoverageTypes[type] && line.hasGroups[type]">
                  <img class="icon" v-if="line.showDetails.value === type" src="../assets/minus.svg" alt="collapse"/>
                  <img class="icon" v-else src="../assets/plus.svg" alt="expand"/>
              </span>
              <span v-if="line.coverageData[type] && !store.hiddenCoverageTypes[type]">{{ line.coverageData[type].hits }}/{{ line.coverageData[type].total }}
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
            <span :class="`${line.color} padded`">{{ code ? line.code : "NO LINE SOURCE AVAILABLE" }}</span>
          </td>
        </tr>
        <template v-if="line.showDetails.value !== ''">
          <tr v-for="(g, gIndex) in file.records[line.showDetails.value]?.lines[line.n].groups" :key="`${line.n}-${gIndex}`" class="details-row">
            <td></td>
              <template v-for="type in coverageTypes" :key="`${line.n}-${type}-${gIndex}`">
                <td v-if="line.showDetails.value === type">
                  <div style="padding-left: 20px; display: flex">
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
        <template v-else><tr style="height: 20px;"></tr></template>
        </template>
        </template>
        </tbody>
      </table>
    </main>
    <div class="sticky-scrollbar"></div>
  </div>
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

th, td:not(:has(.padded)), .padded {
  padding: 0rem 0.3rem;
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

th, td:not(:has(.padded)), .padded {
  white-space: pre-wrap;
  padding: 0rem 0.3rem;
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
  filter: brightness(1.3);
  border: 1px solid rgba(var(--accent-primary-rgb, 0, 120, 215), 0.4);
}

a.router-link-active {
  color: var(--text-muted);
}
</style>
