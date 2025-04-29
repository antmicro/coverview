<script setup>
import { getCoverage, getRateColor, getRate } from '../store.js';
import { computed, ref } from 'vue';
import { store, loadData } from '../store.js';
import { parseDesc } from '../parse.js';

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
  let content = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsText(file);
    });
  const ext = file.name.split('.').pop()
  if (ext == "info") {
    const enhance = {};
    enhance[chosenType] = { name: file.name, content: content };
    loadData(store.files, enhance);
  } else { // ext == desc
    parseDesc(content, store.modules, chosenType);
  }
}

</script>

<template>
    <div class="coverage-summary">
        <table class="summary-table">
            <thead>
            <tr>
                <th></th>
                <th></th>
                <th>Type</th>
                <th>Coverage</th>
                <th>Hit</th>
                <th>Total</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="[type, summary] in Object.entries(coverage_summaries)">
              <th class="loader"><input accept=".info, .desc" @change="onInfoFileUpload($event)" type="file" :ref="(el) => { refs[type] = el }" :name="'add_' + type"><div @click="loadFile(refs[type], type)"><img src="../assets/add.svg" alt="Load coverage from file" /></div></th>
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

th.visibility > div {
  padding: 3px 0 0 0;
}

@media (min-width: 1024px) {
  .summary-table {
    min-width: auto;
  }
  th, td {
    font-size: 0.875rem;
    padding: 0.375rem 1.75rem;
  }
}

@media (max-width: 1023px) {
  .summary-table {
    float: none;
    width: 100%;
    font-size: 0.875rem;
  }
  
  th, td {
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
