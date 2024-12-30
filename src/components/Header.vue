<script setup>
import { BlobReader, ZipReader, BlobWriter } from "@zip.js/zip.js";

import router from '../router/index.js';
import { store } from '../store.js';

const props = defineProps({
  date: String,
  branch: String,
  commit: String,
  logo: String,
  title: String
})

function onDatasetChange(event) {
  store.selected_dataset = event.target.value;
  sessionStorage.setItem('dataset', event.target.value);
  router.go(); // this will automagically reload data anyway
}

async function onFileUpload(event) {
  const file = event.target.files[0];
  const fileInfo = `
    File Name: ${file.name}
    File Size: ${file.size} bytes
    File Type: ${file.type}
  `;

  const zipFileReader = new BlobReader(file);
  const zipReader = new ZipReader(zipFileReader);
  const entries = await zipReader.getEntries();

  const files = {};
  for (const e of entries) {
    const data = await e.getData(new BlobWriter());
    files[e.filename] = await data.text();
  }
  zipReader.close();
  sessionStorage.setItem('files', JSON.stringify(files));
  // need to handle "404"
  router.go(); // this will automagically reload data anyway
};
</script>

<template>
  <header>
    <nav class="navbar">
      <div class="nav-left">
        <a href="./">
          <template class="logo" v-html="logo" v-inline-svg></template>
        </a>
        <span class="path-text">{{ title }}</span>
      </div>
      <input type="file" name="file" id="fileInput" accept=".zip" @change="onFileUpload($event)">
      <select v-if="Object.keys(store?.metadata?.datasets || []).length > 1" @change="onDatasetChange($event)" :value="store.selected_dataset">
        <option v-for="dataset in Object.keys(store.metadata.datasets)" :value="dataset">{{ dataset }}</option>
      </select>
      <div class="nav-right">
        <span class="info-item date">
          <img src="../assets/date.svg" alt="Date icon" />
          <span class="info-text">{{ date.substring(0, 10) }}</span>
        </span>
        <span class="info-item branch">
          <img src="../assets/branch.svg" alt="Branch icon" />
          <span class="info-text branch">{{ branch }}</span>
        </span>
        <span class="info-item commit">
          <img src="../assets/commit.svg" alt="Commit icon" />
          <span class="info-text commit">{{ commit.substring(0, 8) }}</span>
        </span>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-primary);
  flex-wrap: wrap;
  gap: 1rem;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 200px;
}

.logo {
  height: 2.5rem;
  width: auto;
}

.path-text {
  color: var(--text-primary);
  font-size: 0.875rem;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.info-item {
  color: var(--text-muted);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.info-item img {
  width: 1.25rem;
  height: 1.25rem;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0.75rem;
  }

  .nav-left {
    min-width: auto;
  }

  .logo {
    height: 2.5rem;
  }

  .info-text.branch,
  .info-text.commit {
    display: none;
  }

  .info-item {
    padding: 0.5rem;
    border-radius: 4px;
  }

  .info-item img {
    width: 1rem;
    height: 1rem;
  }
}

@media (max-width: 480px) {
  .path-text {
    display: none;
  }

  .nav-right {
    gap: 0.5rem;
  }
}
</style>
