<script setup>
import { useRoute } from "vue-router";
import { store, countCoverageForLine } from '../store.js';
import { computed } from 'vue';

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
      for (const type of store.types) {
        const line = file.value.coverage[type]?.lines[i+1];
        if (line) coverageData[type] = countCoverageForLine(line);
      }
      const lineData = { n: i+1, coverageData, color: getColor(coverageData) };
      if (source) lineData.source = source[i];
      return lineData;
 })
));
</script>

<template>
  <main>
    <div v-if="lines.length == 0">NO COVERAGE / SOURCE DATA FOR THIS FILE IS AVAILABLE.</div>
    <table v-if="lines.length != 0">
      <thead><tr><th></th><th v-for="name in store.types">{{ name }} data</th><th></th><th>Source code</th></tr></thead>
      <tbody>
        <tr v-for="line in lines" :key="line.n">
          <td>{{ line.n }}</td>
          <td v-for="type in store.types" :class="line.color"><span v-if="line.coverageData[type]">{{ line.coverageData[type].hits }}/{{ line.coverageData[type].total }}</span></td>
          <td :class="line.color" style="color: #52525B;">:</td>
          <td class="break" :class="line.color">{{ source ? line.source : 'NO LINE SOURCE AVAILABLE' }}</td>
        </tr>
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

th, td {
  padding: 0.3rem;
  white-space: pre-wrap;
}
td.break {
  word-break: break-all;
}

td:first-of-type {
  color: #71717A;
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
</style>
