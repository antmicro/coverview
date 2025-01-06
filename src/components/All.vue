<script setup>
import { RouterView } from "vue-router";
import Header from "./Header.vue";
import Footer from "./Footer.vue";
import { loadData, store, decompress } from "../store.js";
import router from "../router/index.js";
import Info from "./Info.vue";
async function load() {
  if (Object.keys(store.modules).length === 0) {
    if (Object.keys(store.files).length !== 0) {
      loadData(store.files);
    } else {
      if (Object.keys(originalFiles).length !== 0) {
        store.files = originalFiles;
        loadData(originalFiles);
      } else if (typeof fetchData !== 'undefined') {
        const fetchedFiles = await fetch(fetchData).then(res => res.blob());
        const unzipped = await decompress(fetchedFiles);
        originalFiles = unzipped;
        store.files = originalFiles;
        loadData(originalFiles);
      }
    }
  }
}

await load()

const default_links = {
  "Coverview": "https://github.com/antmicro/coverview"
}
</script>


<template>
  <div class="app-container">
    <div class="content">
      <!-- those props should be read from some input file -->
      <Header :date="store.metadata.timestamp" :logo="store.metadata.logo || ''" :title="store.metadata.title || 'Dashboard'" :commit="store.metadata.commit || '?'" :branch="store.metadata.branch || '?'" :repo="store.metadata.repo || '?'"/>
      <div class="page-wrapper">
      <RouterView :key="$route.path" v-slot="{ Component }">
        <Info :timestamp="store?.metadata?.timestamp"></Info>
        <component :is="Component" />
      </RouterView>
      </div>
    </div>
    <Footer :links="store.metadata.links || default_links" logo="logo.svg" copyright="Copyright Antmicro, 2023-2025." />
  </div>
</template>

<style>
.page-wrapper {
  padding: 0rem 0.75rem 0.75rem;
  width: 100%;
  max-width: 100vw;
}

@media (min-width: 640px) {
  .page-wrapper {
    padding: 0rem 1rem 1rem;
  }
}

@media (min-width: 1024px) {
  .page-wrapper {
    padding: 0rem 2rem 2rem;
  }
}

@media (min-width: 1440px) {
  .page-wrapper {
    padding: 0rem 3rem 3rem;
  }
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1 0 auto;
}

footer {
  flex-shrink: 0;
}
</style>
