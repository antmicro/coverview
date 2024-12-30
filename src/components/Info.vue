<script setup>
import Summary from "../components/Summary.vue";
import { store } from '../store.js';
const props = defineProps({ timestamp: String })
</script>
<template>
  <div class="info-section">
    <div class="info-header">
      <h1 class="info-title">{{$route.params.fileName || $route.params.moduleName || store.metadata.repo || 'Overview'}}</h1>
      <div class="info-metadata">
        <span class="metadata-item">Test timestamp: {{ timestamp }}</span>
      </div>
    </div>
    <Summary :module="$route.params.moduleName" :file="$route.params.fileName"></Summary>
  </div>
</template>

<style>
.info-section {
  display: flex;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-primary);
}

.info-header {
  flex: 1;
  display: flex;
  margin-bottom: 2rem;
  flex-direction: column;
  justify-content: center;
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
</style>