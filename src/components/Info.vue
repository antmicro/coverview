<script setup>
import Summary from "../components/Summary.vue";
import DropdownSelect from "./DropdownSelect.vue";
import { store, loadData } from '../store.js';
import router from "../router/index.js";

const props = defineProps({ timestamp: String });

function onDatasetChange(value) {
  store.selected_dataset = value;
  loadData(store.files);
  router.replace({ query: { dataset: store.selected_dataset } });
}
</script>

<template>
  <div class="info-section">
    <div class="info-header">
      <div class="title-row">
        <DropdownSelect
          v-if="Object.keys(store?.metadata?.datasets || {}).length > 1"
          v-model="store.selected_dataset"
          :options="Object.keys(store.metadata.datasets)"
          label="Select dataset"
          @update:modelValue="onDatasetChange"
        />
        <h1 class="info-title">
          <span>
            <img src="../assets/file.svg" v-if="$route.params.fileName"/>
            <img src="../assets/module.svg" v-else-if="$route.params.moduleName"/>
            <img src="../assets/repo.svg" v-else-if="store.metadata.repo"/>
          </span>
          {{$route.params.fileName || $route.params.moduleName || store.metadata.repo?.split("/").pop() || 'Overview'}}
        </h1>
      </div>
      <div class="info-metadata">
        <span class="metadata-item">Test timestamp: {{ timestamp ? (new Date(timestamp)).toLocaleString('sv') : '?' }}</span>
      </div>
    </div>
    <Summary :module="$route.params.moduleName" :file="$route.params.fileName"></Summary>
  </div>
</template>

<style>
.info-section {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--bg-primary);
  display: flex;
  margin-bottom: 2rem;
  padding: 3rem 0rem 2rem;
  border-bottom: 1px solid var(--border-primary);
}

.info-header {
  width: 80%;
  display: flex;
  margin-bottom: 2rem;
  flex-direction: column;
  justify-content: center;
}

.title-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.info-metadata {
  display: flex;
  gap: 2rem;
}

.metadata-item {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.info-title span img {
  width: 1.25rem;
  height: 1.25rem;
}

@media (max-width: 768px) {
  .info-section {
    flex-direction: column;
    padding: 1.5rem 0.75rem 1rem;
  }

  .info-header {
    margin-bottom: 1rem;
  }

  .title-row {
    gap: 0.75rem;
  }

  .info-title {
    font-size: 1.5rem;
  }
}

@media (min-width: 640px) {
  .info-section {
    padding: 2rem 1rem 1.5rem;
  }
}

@media (min-width: 1024px) {
  .info-section {
    padding: 3rem 2rem 2rem;
  }
}

@media (min-width: 1440px) {
  .info-section {
    padding: 3rem 3rem 2rem;
  }
}
</style>