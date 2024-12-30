<script setup>
import { useRoute } from "vue-router";
import { store } from '../store.js';
import { toRaw } from 'vue';
const params = useRoute().params;
const file = toRaw(store.modules[params.moduleName].files[params.fileName]);
const source = file?.source?.split('\n');
let lineCount = 0;
if (source) {
  lineCount = source.length;
} else {
  lineCount = Math.max(...(Object.values(file.coverage).map(x => Object.keys(x.lines || []).toSorted().at(-1))));
}
const lines = Array.from(
  Array(lineCount).keys()
    .map(i => {
      const coverageData = file.coverage.line?.lines[i+1];
      const lineData = { n: i+1, coverageData, color: coverageData > 0 ? "green" : (coverageData === 0 ? "red" : "") };
      if (source) lineData.source = source[i+1];
      return lineData;
 })
);
</script>

<template>
  <main>
    <table>
      <thead><tr><th></th><th>Line data</th><th></th><th>Source code</th></tr></thead>
      <tbody>
        <tr v-for="line in lines" :key="line.n">
          <td>{{ line.n }}</td>
          <td :class="line.color">{{ line.coverageData }}</td>
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
}
th {
  text-align: left;
  color: #A1A1AA;
}

th, td {
  padding: 0.5rem;
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
</style>
