<script setup>
import { RouterView } from "vue-router";
import Header from "./components/Header.vue";
import Footer from "./components/Footer.vue";
import { loadData, store } from "./store.js";
import router from "./router/index.js";
import Info from "./components/Info.vue";

let f = sessionStorage.getItem("files");
if (f) {
  loadData(JSON.parse(f));
}
else if (Object.keys(files).length !== 0) {
  loadData(files);
}

function reset() {
  sessionStorage.removeItem("files");
  router.go();
}

const default_links = {
  "Coverview": "https://github.com/antmicro/coverview"
}

</script>
<template>
  <div class="app-container">
    <div class="content">
      <div class="reset" v-if="f" @click="reset">Data from session storage. Click here to reset.</div>
      <!-- those props should be read from some input file -->
      <Header :date="store.metadata.timestamp || '?'" :logo="store.metadata.logo || ''" :title="store.metadata.title || 'Dashboard'" :commit="store.metadata.commit || '?'" :branch="store.metadata.branch || '?'"/>
      <div class="page-wrapper">
        <Info :timestamp="store?.metadata?.timestamp?.replace('T', ' ') || '?'"></Info>
        <RouterView :key="$route.path"/>
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
