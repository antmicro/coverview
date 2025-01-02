<script setup>
import Summary from "../components/Summary.vue";
import { store } from '../store.js';
const props = defineProps({ timestamp: String })
</script>
<template>
  <div class="info-section">
    <div class="info-header">
      <h1 class="info-title">
        <span>
          <img src="../assets/file.svg" v-if="$route.params.fileName"/>
          <img src="../assets/module.svg" v-else-if="$route.params.moduleName"/>
          <img src="../assets/repo.svg" v-else-if="store.metadata.repo"/>
        </span>
      {{$route.params.fileName || $route.params.moduleName || store.metadata.repo?.split("/").pop() || 'Overview'}}
      </h1>
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
  z-index: 1;
  background: var(--bg-primary);
  display: flex;
  margin-bottom: 2rem;
  padding: 3rem 0rem 2rem;
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
.info-title span img {
  width: 1.25rem;
  height: 1.25rem;
}
</style>