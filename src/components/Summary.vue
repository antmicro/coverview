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
  overflow: hidden;
  width: 100%;
}

.summary-table {
  float: right;
  border-collapse: collapse;
}

.summary-table, th, td {
  border: 1px solid var(--border-primary);
}

th, td {
  padding: 0.5rem;
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
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

@media (min-width: 640px) {
  th, td {
    padding: 0.75rem 1rem;
  }
}

@media (min-width: 1024px) {
  th, td {
    padding: 12px 30px;
  }
  
  .summary-table {
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .summary-table {
    float: none;
    width: 100%;
    font-size: 0.875rem;
  }
  
  th {
    font-size: 0.75rem;
  }
}
</style>