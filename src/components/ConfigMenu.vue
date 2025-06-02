<script setup>
import { computed, ref } from 'vue';
import router from '../router/index.js';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();

const isOpen = ref(false)

const flatFileList = computed({
  get() {
    return route.query.flatFileList == "true";
  },
  set(newValue) {
    router.replace({ query: { ...route.query, flatFileList: newValue }});
  }
})

const hideNotCovered = computed({
  get() {
    return route.query.hideNotCovered == "true";
  },
  set(newValue) {
    router.replace({ query: { ...route.query, hideNotCovered: newValue }});
  }
})

const burndown = computed({
  get() {
    return route.query.burndown == "true";
  },
  set(newValue) {
    router.replace({ query: { ...route.query, burndown: newValue }});
  }
})
</script>

<template>
  <button class="config-menu-toggle-button" @click="isOpen = !isOpen">
    <img src="../assets/settings.svg"/>
  </button>
  <div class="config-menu-container" v-if="isOpen">
    <div class="switch-container">
      <input id="burndown-checkbox" type="checkbox" v-model="burndown"/>
      <label for="burndown-checkbox" class="switch"/>
      <label for="burndown-checkbox" class="config-menu-label">Burndown</label>
    </div>
    <hr class="config-menu-separator"/>
    <div class="switch-container">
      <input id="flat-file-list-checkbox" type="checkbox" v-model="flatFileList"/>
      <label for="flat-file-list-checkbox" class="switch"/>
      <label for="flat-file-list-checkbox" class="config-menu-label">Flat file list</label>
    </div>
    <hr class="config-menu-separator"/>
    <div class="switch-container">
      <input id="hide-not-covered-checkbox" type="checkbox" v-model="hideNotCovered"/>
      <label for="hide-not-covered-checkbox" class="switch"/>
      <label for="hide-not-covered-checkbox" class="config-menu-label">Hide files without coverage</label>
    </div>
  </div>
</template>

<style scoped>
.config-menu-label {
  margin-left: 10px;
  font-size: 0.9rem;
}

.config-menu-container {
  position: absolute;
  top: 200%;
  right: 0;
  min-width: 300px;
  min-height: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  background-color: var(--bg-primary);
  z-index: 999999;
  display: flex;
  flex-direction: column;
}

.config-menu-separator {
  width: 100%;
  margin: 7px 0;
  border: 1px solid var(--bg-secondary);
}

.switch-container {
  display: flex;
  align-items: center;
  height: 24px;
  line-height: 24px;
}

.switch-container input {
  display: none;
}

.switch-container input:checked + .switch:before {
  left: 22px;
}

.switch-container input:checked + .switch {
  background-color: #22c55e;
}

.switch {
  display: inline-block;
  width: 40px;
  height: 20px;
  background-color: var(--bg-secondary);
  border-radius: 20px;
  transition: background-color 0.3s;
  cursor: pointer;
}

.switch:before {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: white;
  transition: left 0.3s;
}
</style>

