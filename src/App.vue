<script setup>
import { RouterView } from "vue-router";
import Header from "./components/Header.vue";
import Footer from "./components/Footer.vue";
import { loadData, store, decompress } from "./store.js";
import router from "./router/index.js";
import Info from "./components/Info.vue";

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
        loadData(originalFiles);
      }
    }
  }
  }

load()

function reset() {
  store.modules = {};
  store.loadedFromFile = false;
  router.go();
}

const default_links = {
  "Coverview": "https://github.com/antmicro/coverview"
}
</script>
<template>
  <div class="app-container">
    <div class="content">
      <div class="reset" v-if="store.loadedFromFile" @click="reset">Data from file. Click here to reset.</div>
      <!-- those props should be read from some input file -->
      <Header :date="store.metadata.timestamp" :logo="store.metadata.logo || ''" :title="store.metadata.title || 'Dashboard'" :commit="store.metadata.commit || '?'" :branch="store.metadata.branch || '?'"/>
      <div class="page-wrapper">
        <RouterView :key="$route.path" v-slot="{ Component }">
          <Info :timestamp="store?.metadata?.timestamp"></Info>
          <component :is="Component" />
        </RouterView>
      </div>
    </div>
    <Footer :links="store.metadata.links || default_links" logo="logo.svg" copyright="Copyright Antmicro, 2023-2024." />
  </div>
</template>

<style>
.page-wrapper {
  padding: 3rem;
  width: 100%;
  max-width: 100vw;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1 0 auto;
}

.reset {
  text-align: center;
}

footer {
  flex-shrink: 0;
}
</style>
