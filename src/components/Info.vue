<script setup>
import Summary from "../components/Summary.vue";
import DropdownSelect from "./DropdownSelect.vue";
import { store, selectDataset, pathType } from '../store.js';
import router from "../router/index.js";
import { computed } from "vue";

const props = defineProps({
  timestamp: String,
  path: String,
});

function onDatasetChange(value) {
  selectDataset(value);
  router.replace({ query: { dataset: store.selectedDataset } });
}

const pathKind = computed(() => pathType(props.path));

</script>

<template>
  <div class="info-section">
    <div class="info-header">
      <div class="title-row">
        <DropdownSelect
          v-if="Object.keys(store?.metadata?.datasets ?? {}).length > 1"
          v-model="store.selectedDataset"
          :options="Object.keys(store.metadata.datasets)"
          label="Select dataset"
          @update:modelValue="onDatasetChange"
        />
        <h1 class="info-title">
          <span>
            <img src="../assets/file.svg" v-if="pathKind === 'file'"/>
            <img src="../assets/module.svg" v-else-if="pathKind === 'dir'"/>
            <img src="../assets/repo.svg" v-else-if="store.metadata.repo"/>
          </span>
          {{ (props.path ? props.path.split('/').pop() : store.metadata.repo?.split("/").pop()) || 'Overview' }}
        </h1>
      </div>
      <div class="info-metadata" v-if="timestamp">
        <span class="metadata-item">Test timestamp: {{ (new Date(timestamp)).toLocaleString('sv') }}</span>
      </div>
    </div>
    <Summary :path="props.path"></Summary>
  </div>
</template>

<style>
.info-section {
  position: sticky;
  top: 0;
  z-index: 99999;
  background: var(--bg-primary);
  display: flex;
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

  .info-section {
    padding: 1rem 0;
}
</style>