<script setup>
import { RouterView } from "vue-router";
import Header from "./Header.vue";
import Footer from "./Footer.vue";
import LandingPage from "./LandingPage.vue";
import { loadData, store, decompress } from "../store.js";
import Info from "./Info.vue";
import { computed } from "vue";

const hasData = computed(() => {
  return Object.keys(store.modules).length > 0;
});

async function load() {
  if (Object.keys(store.modules).length === 0) {
    if (Object.keys(store.files).length !== 0) {
      loadData(store.files);
    } else {
      if (Object.keys(originalFiles).length !== 0) {
        store.files = originalFiles;
        loadData(originalFiles);
      } else if (typeof embeddedZipArchive === 'string') {
        const blob = await fetch(`data:application/zip;base64,${embeddedZipArchive}`).then(res => res.body);
        const unzipped = await decompress(blob);
        originalFiles = unzipped
        store.files = originalFiles;
        loadData(originalFiles);
      } else if (typeof fetchData !== 'undefined') {
        let url = fetchData;
        if (typeof templatedFetchUrl !== 'undefined') {
          for (const [key, val] of new URLSearchParams(window.location.search)) {
            url = templatedFetchUrl.replace(`___${key}___`, val)
          }
        }
        const ext = url.split('.').pop();
        const fetchedFiles = await fetch(url).then(res => res.body);
        const unzipped = await decompress(fetchedFiles, ext);
        originalFiles = unzipped;
        store.files = originalFiles;
        loadData(originalFiles);
      }
    }
  }
}

store.loaded = load();
await store.loaded;

const default_links = {
  "Coverview": "https://github.com/antmicro/coverview"
}
</script>

<template>
  <div class="app-container">
    <div class="content">
      <!-- those props should be read from some input file -->
      <Header :date="store.metadata.timestamp" :logo="store.metadata.logo || ''" :title="store.metadata.title || 'Dashboard'" :commit="store.metadata.commit || '?'" :branch="store.metadata.branch || '?'" :repo="store.metadata.repo || '?'"/>
      <div class="page-wrapper" v-if="hasData">
        <RouterView :key="$route.path" v-slot="{ Component }">
          <Info :timestamp="store?.metadata?.timestamp"></Info>
          <component :is="Component" />
        </RouterView>
      </div>
      <LandingPage v-else />
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
  display: flex;
  flex-direction: column;
}

footer {
  flex-shrink: 0;
}
</style>
