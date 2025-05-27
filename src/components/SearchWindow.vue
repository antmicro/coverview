<script setup>
import { RouterLink, useRoute } from 'vue-router';
import { computed, ref, useTemplateRef, watch, onMounted, nextTick } from 'vue';
import router from '../router/index.js';
import { store } from '../store.js';
import fuzzysort from 'fuzzysort'

const route = useRoute();

const searchWindowRef = useTemplateRef("search-window");
const searchInputRef = useTemplateRef("search-window-input");

const searchInput = ref("");
const selectedPathIdx = ref(0);

const fuzzySearchOptions = {
  limit: 100
};

const searchResult = computed(() => {
  return searchInput.value == "" ? [] :
    fuzzysort.go(searchInput.value, Object.keys(store.files), fuzzySearchOptions);
});

onMounted(() => {
  searchInput.value = "";
  searchInputRef.value.focus();
});

watch(searchResult, () => selectedPathIdx.value = 0);

function closeSearchWindow(event) {
  if (!searchWindowRef.value?.contains(event.target)) {
    store.showSearchWindow = false;
  }
}

async function selectPrevResult() {
  selectedPathIdx.value = Math.max(selectedPathIdx.value - 1, 0);
  await nextTick();
  searchWindowRef.value.querySelector(".search-result-entry.selected")?.scrollIntoView({ block: "center" });
}

async function selectNextResult() {
  selectedPathIdx.value = Math.min(selectedPathIdx.value + 1, searchResult.value.length - 1);
  await nextTick();
  searchWindowRef.value.querySelector(".search-result-entry.selected")?.scrollIntoView({ block: "center" });
}

function navigateToSelected() {
  if (selectedPathIdx.value < searchResult.value.length) {
    navigateToPath(searchResult.value[selectedPathIdx.value].target);
  }
}

function navigateToPath(path) {
    router.replace({ path: `${encodeURIComponent(path)}`, query: route.query });
    store.showSearchWindow = false;
}

function splitPathByMatched(result) {
  let path = result.target;
  let intervals = indicesToIntervals(result.indexes);

  let lastEnd = 0;
  let split = [];
  for (let entry of intervals) {
    let [start, end] = entry;
    split.push(path.slice(lastEnd, start));
    split.push(path.slice(start, end + 1));
    lastEnd = end + 1;
  }
  split.push(path.slice(lastEnd));

  return split;
}

function indicesToIntervals(indices) {
  if (indices.length == 0) {
    return [];
  }

  let intervals = []
  let current = [indices[0], indices[0]];
  for (let idx of indices.slice(1)) {
    if (idx == current[1] + 1) {
      current[1]++;
    } else {
      intervals.push(current);
      current = [idx, idx];
    }
  }
  intervals.push(current);

  return intervals;
}
</script>

<template>
  <div 
    class="search-window-overlay"
    @click="closeSearchWindow"
    @keydown.up.prevent="selectPrevResult"
    @keydown.down.prevent="selectNextResult"
    @keyup.esc="store.showSearchWindow = false"
    @keyup.enter="navigateToSelected">
    <div class="search-window-wrapper">
      <div class="search-window-container" ref="search-window">
        <input type="text" class="search-window-input" ref="search-window-input" v-model="searchInput" autocomplete="off"/>
        <div class="search-result-container">
          <template v-for="[idx, result] in searchResult.entries()" :key="result.target">
            <div 
              class="search-result-entry"
              :class="[selectedPathIdx == idx ? 'selected' : '']"
              @mouseenter="selectedPathIdx = idx"
              @click="navigateToPath(result.target)">
              <!-- Every second path fragment is matched -->
              <template v-for="[idx, text] in splitPathByMatched(result).entries()" :key="idx">
                <template v-if="idx % 2 == 0">{{ text }}</template>
                <mark class="match-highlight" v-else>{{ text }}</mark>
              </template>
            </div>
            <hr class="search-result-separator"/>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-window-overlay {
  position: fixed;
  top: 0;
  left:0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999999;
  background-color: rgba(0, 0, 0, 0.8);
}

.search-window-wrapper {
  width: 800px;
  height: 600px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.search-window-container {
  width: 800px;
  max-height: 600px;
  background-color: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.search-window-input {
  width: 100%;
  height: 40px;
  padding: 3px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid;
  color: var(--text-primary);
  outline: 0;
  margin: 5px 0;
}

.search-result-container {
  width: 100%;
  max-height: 530px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.search-result-entry {
  width: 100%;
  padding: 0 5px;
  min-height: 40px;
  line-height: 40px;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  direction: rtl;
  text-align: left;
}

.search-result-entry.selected {
  background-color: var(--bg-secondary);
}

.search-result-separator {
  width: 100%;
  border: 1px solid var(--bg-secondary);
}

.match-highlight {
    background: none;
    color: var(--accent-primary);
}
</style>

