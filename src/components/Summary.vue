<script setup>
import { getCoverage, getRateColor, getRate } from '../store.js';
import { toRaw } from "vue";

const props = defineProps(['module', 'file']);

let coverage_summaries = getCoverage(props.module, props.file);
</script>

<template>
    <div class="coverage-summary">
        <table class="summary-table">
            <thead>
            <tr>
                <th></th>
                <th>Coverage</th>
                <th>Hit</th>
                <th>Total</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="[name, summary] in Object.entries(coverage_summaries)">
                <th>{{ name }}</th>
                <td :style="{ backgroundColor: getRateColor(getRate(summary), true) }">{{ getRate(summary) }}%</td>
                <td>{{ summary.hits }}</td>
                <td>{{ summary.total }}</td>
            </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
.coverage-summary {
  flex: 1;
  overflow: hidden;
}

.summary-table {
  float: right;
}

.summary-table, th, td {
  border-collapse: collapse;
  border: 1px solid var(--border-primary);
}

th, td {
  padding: 12px 30px;
  text-align: center;
}

th {
  font-weight: 500;
  font-size: 0.875rem;
}
</style>