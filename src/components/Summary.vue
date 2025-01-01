<script setup>
import { getCoverage, getRateColor, getRate } from '../store.js';
import { computed } from 'vue';
import { store } from '../store.js';

const props = defineProps(['module', 'file']);

let coverage_summaries = computed(() => getCoverage(props.module, props.file));
</script>

<template>
    <div class="coverage-summary">
        <table class="summary-table">
            <thead>
            <tr>
                <th></th>
                <th></th>
                <th>Coverage</th>
                <th>Hit</th>
                <th>Total</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="[name, summary] in Object.entries(coverage_summaries)">
                <th class="visibility"><div @click='() => store.types[name].visibility = !store.types[name].visibility'><img src="../assets/visibility.svg" alt="Hide icon" v-if="store.types[name].visibility"/><img src="../assets/visibility-off.svg" alt="Show icon" v-else/></div></th>
                <th>{{ name }}</th>
                <td :style="{ backgroundColor: getRateColor(getRate(summary), true, !store.types[name].visibility) }">{{ getRate(summary) }}%</td>
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

th.visibility > div {
  padding: 3px 0 0 0;
}

th.visibility > div > img {
  width:1.25rem;
  height:1.25rem;
  cursor: pointer;
}
</style>