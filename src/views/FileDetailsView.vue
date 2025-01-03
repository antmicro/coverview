<script setup>
import { useRoute } from "vue-router";
import { store, countCoverageForLine } from '../store.js';
import { computed, ref } from 'vue';

const params = useRoute().params;
const file = computed(() => store.modules[params.moduleName].files[params.fileName]);
const source = file?.value?.source?.split('\n');
let lineCount = 0;

if (source) {
  lineCount = source.length;
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

let lines = computed(() => Array.from(
  Array(lineCount).keys()
    .map(i => {
      const coverageData = {};
      for (const type of Object.keys(store.types)) {
        if (store.types[type].visibility) {
          const line = file.value.coverage[type]?.lines[i+1];
          if (line) coverageData[type] = countCoverageForLine(line);
        }
      }
      const lineData = { n: i+1, coverageData, color: getColor(coverageData), showDetails: ref('') };
      if (source) lineData.source = source[i];
      return lineData;
 })
));

const toggleDetails = (line, type) => {
  line.showDetails.value = (line.showDetails.value === type) ? '' : type;
}

</script>

<template>
  <main>
    <div v-if="lines.length == 0">NO COVERAGE / SOURCE DATA FOR THIS FILE IS AVAILABLE.</div>
    <table v-if="lines.length != 0">
      <thead><tr><th></th><th v-for="name in Object.keys(store.types)">{{ name }} data</th><th></th><th>Source code</th></tr></thead>
      <tbody>
        <template v-for="line in lines" :key="line.n">
        <tr>
          <td>{{ line.n }}</td>
          <td v-for="type in Object.keys(store.types)">
            <span :class="`${line.color} padded`">
              <span style="padding-right: 5px; padding-bottom: 3px; cursor: pointer; height: 18px; width: 18px; display: flex; align-items: center;" @click="toggleDetails(line, type)" v-if="line.coverageData[type] && store.types[type].visibility && file.coverage[type]?.lines[line.n].groups">
                  <img v-if="line.showDetails.value === type" src="../assets/minus.svg" alt="collapse"/>
                  <img v-else src="../assets/plus.svg" alt="expand"/>
              </span>
              <span v-if="line.coverageData[type] && store.types[type].visibility">{{ line.coverageData[type].hits }}/{{ line.coverageData[type].total }}</span>
            </span>
            <div v-if="type === 'toggle' && line.showDetails.value !== ''">
              <div v-for="g in file.coverage[line.showDetails.value]?.lines[line.n].groups" style="padding-left: 20px;">
                <div v-for="datapoint in g" :class="`${datapoint.value < 1 ? 'red' : 'green'} 'datapoint'`" style="padding: 0rem 0.5rem;">{{ datapoint.value }}</div>
              </div>
            </div>
          </td>
          <td style="color: #52525B;"><span :class="`${line.color} padded`">:</span></td>
          <td class="break">
            <span :class="`${line.color} padded`">{{ source ? line.source : 'NO LINE SOURCE AVAILABLE' }}</span>
            <div v-if="line.showDetails.value !== ''">
              <div v-for="g in file.coverage[line.showDetails.value]?.lines[line.n].groups">
                <div v-for="datapoint in g" :class="`${datapoint.value < 1 ? 'red' : 'green'} 'datapoint'`" style="padding: 0rem 0.5rem;">{{ datapoint.info }}</div>
              </div>
            </div>
          </td>
        </tr>
      </template>
      </tbody>
    </table>
  </main>
</template>

<style scoped>
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
</style>
