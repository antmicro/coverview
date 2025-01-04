<script setup>
import { getCoverage, getRateColor, getRate } from '../store.js';
import { computed, ref } from 'vue';
import { store, loadData } from '../store.js';

const props = defineProps(['module', 'file']);

let coverage_summaries = computed(() => getCoverage(props.module, props.file));

const refs = ref({});

let chosenType = null;

const loadFile = (inputRef, type) => {
  inputRef.click();
  chosenType = type;
}

async function onInfoFileUpload(event) {
  const file = event.target.files[0];
  let p = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsText(file);
    });
  const enhance = {};
  enhance[chosenType] = await p;
  loadData(store.files, enhance);
}

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
            <tr v-for="[type, summary] in Object.entries(coverage_summaries)">
              <th class="loader"><input accept=".info" @change="onInfoFileUpload($event)" type="file" :ref="(el) => { refs[type] = el }" :name="'add_' + type"><div @click="loadFile(refs[type], type)"><img src="../assets/add.svg" alt="Load coverage from file" /></div></th>
              <th class="visibility"><div @click='() => store.types[type].visibility = !store.types[type].visibility'><img src="../assets/visibility.svg" alt="Hide icon" v-if="store.types[type].visibility"/><img src="../assets/visibility-off.svg" alt="Show icon" v-else/></div></th>
                <th>{{ type }}</th>
                <td :style="{ backgroundColor: getRateColor(getRate(summary), true, !store.types[type].visibility) }">{{ getRate(summary) }}%</td>
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

@media (min-width: 640px) {
  th, td {
    padding: 0.75rem 1rem;
  }
}

@media (min-width: 1024px) {
  th, td {
    padding: 0.75rem 1.875rem;
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

th > div > img {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

th.loader input {
  display: none;
}
</style>
