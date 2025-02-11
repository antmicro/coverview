<script setup>
import { useRoute } from "vue-router";
import { store, countCoverageForLine } from '../store.js';
import { computed, ref, onMounted } from 'vue';

const params = useRoute().params;
const file = computed(() => store.modules[params.moduleName].files[params.fileName]);
const code = file?.value?.source?.split('\n');
const originThreshold = 10;
let lineCount = 0;

if (code) {
  lineCount = code.length;
} else {
  lineCount = Math.max(...(Object.values(file.value.coverage).map(x => Object.keys(x.lines || []).toSorted().at(-1) || 0)));
}

function getColor(coverageData) {
  if (Object.keys(coverageData).length === 0) return "";
  const hitsAndTotal = Object.values(coverageData).reduce((acc, curr) => {return {hits: acc.hits + curr.hits, total: acc.total + curr.total}});
  if (hitsAndTotal.hits == hitsAndTotal.total) return "green";
  if (hitsAndTotal.hits == 0) return "red";
  return "yellow";
}

let lines = computed(() => Array.from(Array(lineCount).keys())
    .map(i => {
      const coverageData = {};
      let hitOrigins = []; // this is a bit hacky, as we only have "line" inside the loop
      // we use hitOrigins as the tests which hit the line since "source" is confusing
      for (const type of Object.keys(store.types)) {
        if (store.types[type].visibility) {
          const line = file.value.coverage[type]?.lines[i+1];
          if (line) {
            coverageData[type] = countCoverageForLine(line);
            hitOrigins = Array.from(line.source);
          }
        }
      }
      const lineData = { n: i+1, coverageData, color: getColor(coverageData), showDetails: ref(''), showOrigins: ref(false), hitOrigins };
      if (code) lineData.code = code[i];
      return lineData;
 }));

const toggleDetails = (line, type) => {
  line.showDetails.value = (line.showDetails.value === type) ? '' : type;
}

const toggleLineOrigins = (line, value) => {
  line.showOrigins.value = value;
}

onMounted(() => {
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
});
</script>

<template>
  <div class="wrapper">
    <main>
    <div v-if="lines.length == 0">NO COVERAGE / SOURCE DATA FOR THIS FILE IS AVAILABLE.</div>
    <table v-if="lines.length != 0">
      <thead><tr><th></th><th v-for="name in Object.keys(store.types)">{{ name }} data</th><th></th><th>Source code</th></tr></thead>
      <tbody>
        <template v-for="line in lines" :key="line.n">
        <tr>
          <td><span style="margin-top: -286px; position: absolute;" :id="`line-${line.n}`"></span><RouterLink :to="`#line-${line.n}`">{{ line.n }}</RouterLink></td>
          <td v-for="type in Object.keys(store.types)">
            <span :class="`${line.color} padded`">
              <span style="padding-right: 5px; padding-bottom: 3px; cursor: pointer; height: 18px; width: 18px; display: flex; align-items: center;" @click="toggleDetails(line, type)" v-if="line.coverageData[type] && store.types[type].visibility && file.coverage[type]?.lines[line.n].groups">
                  <img class="icon" v-if="line.showDetails.value === type" src="../assets/minus.svg" alt="collapse"/>
                  <img class="icon" v-else src="../assets/plus.svg" alt="expand"/>
              </span>
              <span v-if="line.coverageData[type] && store.types[type].visibility">{{ line.coverageData[type].hits }}/{{ line.coverageData[type].total }}
                  <div class="remarks" @mouseleave="toggleLineOrigins(line, false)">
                      <ul>
                          <li class="remark" v-if="!line.showOrigins.value" v-for="origin in line.hitOrigins.slice(0, originThreshold)">{{origin}}</li>
                          <li class="remark" v-else v-for="origin in line.hitOrigins">{{origin}}</li>
                          <li class="remark" style="cursor: pointer;" @click="toggleLineOrigins(line, true)" v-if="!line.showOrigins.value && line.hitOrigins.length > originThreshold">Show more...</li>
                      </ul>
                  </div>
              </span>
            </span>
            <div v-if="line.showDetails.value === type">
              <div v-for="g in file.coverage[line.showDetails.value]?.lines[line.n].groups" style="padding-left: 20px; display: flex;">
                <div :title="datapoint.value < 1 ? [...datapoint.zeroSource].join(' ') : [...datapoint.source].join(' ')" v-for="datapoint in g" :class="`${datapoint.value < 1 ? 'red' : 'green'} datapoint`" style="padding: 0rem 0.5rem;">{{ datapoint.value }}</div>
              </div>
            </div>
          </td>
          <td style="color: #52525B;"><span :class="`${line.color} padded`">:</span></td>
          <td class="break">
            <span :class="`${line.color} padded`">{{ code ? line.code : 'NO LINE SOURCE AVAILABLE' }}</span>
            <div v-if="line.showDetails.value !== ''">
              <div v-for="g in file.coverage[line.showDetails.value]?.lines[line.n].groups" style="display: flex;">
                <div v-for="(datapoint, info) in g" :class="`${datapoint.value < 1 ? 'red' : 'green'} datapoint`" style="padding: 0rem 0.5rem;">{{ info }}</div>
              </div>
            </div>
          </td>
        </tr>
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
    table-layout: fixed;
    white-space: nowrap;
    width: max-content;
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
  font-family: monospace;
  font-size: 0.8rem;
}
th {
  text-align: left;
  color: #A1A1AA;
}

th, td:not(:has(.padded)), .padded {
  white-space: pre-wrap;
  padding: 0rem 0.3rem;
}
td.break {
  word-break: break-all;
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

.green {
  background: #042F2E;
}

.red {
  background: #450A0A;
}

.yellow {
  background: #854d0e;
}

.datapoint:first-of-type {
  padding-top: 0.5rem;
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
    width: 100%;
    z-index: 3;
}

span:hover .remarks ul {
    width: max-content;
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
</style>
