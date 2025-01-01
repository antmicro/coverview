<script setup>
//import SortIcon from "../components/SortIcon.vue";
import { store, getCoverage, getRateColor, getRate } from '../store.js';
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import router from '../router/index.js';

let route = useRoute();

let tableData = computed(() => {
  let td = [];
  let totals = {};
  if (!route.params.moduleName) {
    td = Object.entries(store.modules).map(([module, _]) => ({
      source: module,
      data: getCoverage(decodeURIComponent(module), null)
    }));
    totals = getCoverage(null, null)
  } else {
    const moduleName = decodeURIComponent(route.params.moduleName);
    if (!(moduleName in store.modules)) return [];
    td = Object.entries(store.modules[moduleName].files).map(([fileName, _]) => ({
      source: fileName,
      data: getCoverage(moduleName, fileName)
    }));
    totals = getCoverage(moduleName);
  }
  return td.sort((a,b) => { return a.source.localeCompare(b.source) });
});

/*const sortOrder = ref("asc");
const sortKey = ref("source");

const sortedData = computed(() => tableData.sort((a, b) => {
    const modifier = sortOrder.value === "asc" ? 1 : -1;
    if (a[sortKey.value] < b[sortKey.value]) return -1 * modifier;
    if (a[sortKey.value] > b[sortKey.value]) return 1 * modifier;
    return 0;
}));*/

/*const sort = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
}*/

const buildRoute = (target) => {
  return (route.params.moduleName ? encodeURIComponent(route.params.moduleName) + '/' : '') + encodeURIComponent(target);
}

function navigate(target) {
  router.push(buildRoute(target));
}
</script>

<template>
  <div class="table-container">
    <table>
      <thead>
        <tr class="header-groups">
          <th></th>
          <th colspan="3" class="group-header" v-for="name in Object.keys(store.types)">{{ name }}</th>
        </tr>
        <tr>
          <th class="source-column">
            Source
          </th>
          <template v-for="_ in Object.keys(store.types)">
            <th class="rate-column">
              Rate
            </th>
            <th class="hit-column">
              Hit
            </th>
            <th class="total-column">
              Total
            </th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr class="link" @click="navigate(item.source)" v-for="item in tableData" :key="item.source">
          <td class="name">
            <img v-if="$route.params.moduleName" src="../assets/file.svg" alt="file" />
            <img v-else src="../assets/module.svg" alt="module" />
            {{ item.source }}
          </td>
          <template v-for="name in Object.keys(store.types)">
            <td class="rate-cell">
              <div class="progress-wrapper">
                <div class="progress-container">
                  <div
                    class="progress-bar"
                    :style="{
                      width: `${getRate(item.data[name])}%`,
                      backgroundColor: getRateColor(getRate(item.data[name])),
                    }"
                  ></div>
                </div>
                <span class="rate-value" :style="{ color: getRateColor(getRate(item.data[name])) }"> {{ getRate(item.data[name]) }}% </span>
              </div>
            </td>
            <td class="hit-cell">{{ item.data[name]?.hits || 'N/A'}}</td>
            <td class="total-cell">{{ item.data[name]?.total || 'N/A' }}</td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.coverage-type {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.coverage-rate {
  font-weight: 500;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  background-color: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

th,
td {
  border: 1px solid var(--border-primary);
  border-width: 1px 1px 0 0;
  padding: 12px;
}

tr.link {
  cursor: pointer;
}

th:last-child,
td:last-child {
  border-right: 0;
}

tr:last-child td {
  border-bottom: 0;
}

.header-groups th {
  text-align: center;
  font-weight: 500;
  padding: 12px;
}

th {
  text-align: left;
  font-weight: 500;
  font-size: 0.875rem;
  white-space: nowrap;
}

.source-link {
  text-decoration: none;
  transition: color 0.2s;
}

.source-link:hover {
  color: var(--accent-primary);
}

.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-container {
  width: 100%;
  height: 4px;
  background-color: var(--bg-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.rate-value {
  min-width: 60px;
}

.hit-cell, .total-cell {
  text-align: right;
  width: 70px;
}

.hit-column, .total-column {
  text-align: center;
  width: 70px;
}

.rate-column, .rate-cell {
  width: auto;
}

.table-container > table > tbody > tr:hover {
  background-color: var(--border-primary);
}

/*.sortable-header {
  position: relative;
  cursor: pointer;
  user-select: none;
}

.sort-icon {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.sortable-header:hover .sort-icon {
  background-color: var(--bg-secondary);
}

.sort-icon svg path {
  color: var(--text-muted);
  transition: color 0.2s;
}

.sort-icon svg path.highlighted {
  color: var(--text-primary);
}*/

@media (max-width: 768px) {
  .page-wrapper {
    padding: 0.5rem;
  }

  .info-section {
    flex-direction: column;
  }

  .info-header {
    margin-bottom: 1.5rem;
  }

  .info-title {
    font-size: 1.5rem;
  }

  .info-metadata {
    flex-direction: column;
    gap: 0.5rem;
  }

  th,
  td {
    padding: 8px;
  }
  .sortable-header {
    padding-right: 1rem;
  }
}

.name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.name img {
  width: 0.8rem;
  height: auto;
}

@media (max-width: 640px) {
  th,
  td {
    padding: 6px;
    font-size: 14px;
  }
}
</style>