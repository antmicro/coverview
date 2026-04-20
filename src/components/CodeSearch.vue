<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import CodeSearchModel from '../CodeSearchModel.js';

const props = defineProps({
  codeSearchModel: {
    type: CodeSearchModel,
    required: true,
  },
});

const isVisible = ref(false);
const searchQuery = ref('');
const searchInput = ref(null);
const resultCount = ref(0);
const current = ref(0);
const searchDebounceMs = 300;
let searchTimeout = null;

const handleInput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    current.value = 0;
    resultCount.value = props.codeSearchModel.onSearch(searchQuery.value);
  }, searchDebounceMs);
};

const clearSearch = () => {
  clearTimeout(searchTimeout);
  searchQuery.value = '';
  current.value = 0;
  resultCount.value = props.codeSearchModel.onSearch('');
};

const handleKeyDown = (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    toggleSearch();
  } else if (event.key === 'Enter') {
    if (event.shiftKey) {
      current.value = props.codeSearchModel.prevResult();
    } else {
      current.value = props.codeSearchModel.nextResult();
    }
  } else if (event.key === 'Escape' && isVisible.value) {
    isVisible.value = false;
    clearSearch();
  }
};

const toggleSearch = async () => {
  isVisible.value = !isVisible.value;

  if (isVisible.value) {
    // Wait for next tick so the element is rendered before focusing
    await nextTick();
    if (searchInput.value) {
      searchInput.value.focus();
    }
  } else {
    clearSearch();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  clearTimeout(searchTimeout);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div v-if="isVisible" class="code-search-container">
    <div class="search-input-wrapper">
      <label for="search-input" class="search-label">search</label>
      <input
        id="search-input"
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        class="search-input"
        @input="handleInput"
      />
      <div class="counter"><p v-if="resultCount">{{ current + 1 }}/{{ resultCount }}</p></div>
    </div>
  </div>
</template>

<style scoped>
.code-search-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background-color: #ffffff;
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #ccc;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-label, p {
  font-size: 14px;
  color: #666;
  text-transform: lowercase;
  user-select: none;
}

.counter {
    display: flex;
    justify-content: end;
    min-width: 82px;
}

.search-input {
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  width: 200px;
}
</style>
