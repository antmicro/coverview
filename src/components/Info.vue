<script setup>
import Summary from "../components/Summary.vue";
import DropdownSelect from "./DropdownSelect.vue";
import { store, selectDataset, pathType, hasTableForFile } from "../store.js";
import router from "../router/index.js";
import { computed, ref } from "vue";
import { useRoute, RouterLink } from "vue-router";

const props = defineProps({
  timestamp: String,
  path: String,
});

const route = useRoute();
const queryWithoutHighlight = computed(() => {
  const { L, T, ...rest } = route.query;
  return rest;
});

function onDatasetChange(value) {
  selectDataset(value);
  const query = Object.assign({}, route.query);
  query.dataset = store.selectedDataset;
  router.replace({ query: query });
}

const breadcrumbParts = computed(() => {
  const result = [];
  if (!route.params.path) {
    return result;
  }

  let accumulator = '';
  for (const part of route.params.path.split('/')) {
    result.push({
      name: part,
      target: `/${encodeURIComponent(accumulator + part)}`,
    });
    accumulator += `${part}/`;
  }
  return result;
});
const pathKind = computed(() => pathType(props.path));
const hasTables = computed(() => hasTableForFile(props.path));
const tableVisible = ref(
  hasTables && (route.query?.showTable?.toLowerCase() === "true" ?? false),
);

const toggleTables = () => {
  tableVisible.value = !tableVisible.value;
  router.replace({ query: { ...route.query, showTable: tableVisible.value } });
};
</script>

<template>
  <div class="info-section">
    <div class="info-header">
      <ul class="breadcrumbs">
        <li>
          <RouterLink :to="{ path: '/', query: queryWithoutHighlight }" class="muted-link">{{ store.metadata.repo?.split("/").pop() || 'Overview' }}</RouterLink>
        </li>
        <li v-for="part in breadcrumbParts">
          <img src="../assets/caret.svg" alt="caret" />
          <RouterLink :to="{ path: part.target, query: queryWithoutHighlight }" class="muted-link">{{ part.name }}</RouterLink>
        </li>
      </ul>
      <div class="title-metadata">
        <div class="title-row">
          <DropdownSelect
            v-if="Object.keys(store?.metadata?.datasets ?? {}).length > 1"
            v-model="store.selectedDataset"
            :options="Object.keys(store.metadata.datasets)"
            label="Select dataset"
            @update:modelValue="onDatasetChange"
          />
          <h1 class="info-title">
            <span>
              <img src="../assets/file.svg" v-if="pathKind === 'file'" />
              <img src="../assets/module.svg" v-else-if="pathKind === 'dir'" />
              <img src="../assets/repo.svg" v-else-if="store.metadata.repo" />
            </span>
            {{
              (props.path
                ? props.path.split("/").pop()
                : store.metadata.repo?.split("/").pop()) || "Overview"
            }}
          </h1>
        </div>
        <span class="metadata-item" v-if="timestamp">
          Test timestamp: {{ new Date(timestamp).toLocaleString("sv") }}
        </span>
      </div>
      <button class="table-button" @click="toggleTables" v-if="hasTables">
        Show {{ tableVisible ? "Source" : "Table" }}
      </button>
    </div>
    <Summary :path="props.path"></Summary>
  </div>
</template>

<style scoped>
.info-section {
  position: sticky;
  top: 0;
  z-index: 999;
  background: var(--bg-primary);
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-primary);
  display: flex;
}

.info-header {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

ul {
  display: flex;
  padding: 1rem 1rem 1rem 0rem;
  list-style: none;
  color: #A1A1AA;
  gap: 0.375rem;
  overflow-x: auto;
  width: 100%;
}

li {
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

li > img {
  width: 1rem;
  height: 1rem;
}

.title-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.metadata-item {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.info-title span img {
  width: 1.25rem;
  height: 1.25rem;
}

.table-button {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  background: var(--accent-background);
  border: 1px solid var(--accent-border);
  color: var(--text-primary);
  width: max-content;
}

.table-button:hover {
  border-color: var(--accent-primary);
}

@media (max-width: 768px) {
  .info-section {
    flex-direction: column;
  }

  .info-header {
    margin-bottom: 1rem;
  }

  .title-row {
    gap: 0.75rem;
  }

  .info-title {
    font-size: 1.5rem;
  }
}

.title-metadata {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}
</style>
