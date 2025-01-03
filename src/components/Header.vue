<script setup>
import router from '../router/index.js';
import { store, loadData, decompress } from '../store.js';

const props = defineProps({
  date: String,
  branch: String,
  repo: String,
  commit: String,
  logo: String,
  title: String
})

const showFilePicker = Object.keys(originalFiles).length === 0;

function onDatasetChange(event) {
  store.selected_dataset = event.target.value;
  loadData(store.files);
}

async function onFileUpload(event) {
  const zipFile = event.target.files[0];
  if (!zipFile) {
    return;
  }

  store.files = await decompress(zipFile);
  store.loadedFromFile = true;
  // need to handle "404"
  loadData(store.files);
  router.push('/');
};
</script>

<template>
  <header>
    <nav class="navbar">
      <div class="info">
        <div class="nav-left">
          <a v-if="logo" href="./">
            <template class="logo" v-html="logo" v-inline-svg></template>
          </a>
          <span class="path-text">{{ title }}</span>
        </div>
        <input v-if="showFilePicker" type="file" name="file" id="fileInput" accept=".zip" @change="onFileUpload($event)">
        <select v-if="Object.keys(store?.metadata?.datasets || []).length > 1" @change="onDatasetChange($event)" :value="store.selected_dataset">
          <option v-for="dataset in Object.keys(store.metadata.datasets)" :value="dataset">{{ dataset }}</option>
        </select>
        <div class="nav-right">
          <span class="info-item date">
            <img src="../assets/date.svg" alt="Date icon" />
            <span class="info-text">{{ date ? ((new Date(date)).toLocaleDateString('sv') + ' ' + (new Date(date)).toLocaleTimeString('sv')) : '?' }}</span>
          </span>
          <span class="info-item repo">
            <img src="../assets/repo.svg" alt="Repo icon" />
            <a :href="repo" v-if="repo?.startsWith('https://') || repo?.startsWith('http://')">{{ repo?.split("/").pop() }}</a>
            <span class="info-text branch" v-else>{{ repo?.split("/").pop() }}</span>
          </span>
          <span class="info-item branch">
            <img src="../assets/branch.svg" alt="Branch icon" />
            <span class="info-text branch">{{ branch }}</span>
          </span>
          <span class="info-item commit">
            <img src="../assets/commit.svg" alt="Commit icon" />
            <span class="info-text commit">{{ commit.substring(0, 8) }}</span>
          </span>
          <span class="info-item metadata" v-if="store?.metadata?._additional">
            <img src="../assets/fingerprint.svg" alt="Metadata icon" :title="store.metadata._additional" />
          </span>
        </div>
      </div>
      <ul class="breadcrumbs">
        <li><RouterLink to="/">{{ store.metadata.repo?.split("/").pop() || 'Overview' }}</RouterLink></li>
        <li v-if="$route.params.moduleName">
          <img src="../assets/caret.svg" alt="caret" />
          <RouterLink :to="'/' + encodeURIComponent($route.params.moduleName)">{{ $route.params.moduleName }}</RouterLink>
        </li>
        <li v-if="$route.params.fileName">
          <img src="../assets/caret.svg" alt="caret" />
          <RouterLink :to="'/' + encodeURIComponent($route.params.moduleName) + '/'+ encodeURIComponent($route.params.fileName)">
            {{ decodeURIComponent($route.params.fileName) }}
          </RouterLink>
        </li>
      </ul>
    </nav>
  </header>
</template>

<style scoped>
.navbar {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-primary);
}

.info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
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

ul {
  display: flex;
  padding: 1rem;
  list-style: none;
  border-top: 1px solid #27272A;
  color: #A1A1AA;
  gap: 0.375rem;
}

li {
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

a {
  white-space: nowrap;
  color: #A1A1AA;
  text-decoration: none;
}

a:hover {
  color: #F4F4F5;
  text-decoration: underline;
}

.last {
  color: #F4F4F5;
}

li > img {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 480px) {
  .path-text {
    display: none;
  }

  .nav-right {
    gap: 0.5rem;
    flex-wrap: wrap;
  }
}
</style>
