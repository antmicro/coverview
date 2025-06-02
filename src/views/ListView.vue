<script setup>
import { store, getRateColor, getRate, availableCoverageTypes, getPathChildren, pathType } from '../store.js';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import router from '../router/index.js';

const props = defineProps({
  modulePath: String,
});

const route = useRoute()
const modulePath = computed(() => props.modulePath ?? "");
const coverageTypes = computed(() => availableCoverageTypes());

const tableData = computed(() => {
  const flatList = route.query.flatFileList == "true";
  const parent = modulePath.value ? `${modulePath.value}/` : '';

  const files = flatList ?
    Object.keys(store.files).filter(path => path.startsWith(modulePath.value)) :
    getPathChildren(modulePath.value);

  const td = files.map(path => ({
    name: path,
    path: flatList ? path : `${parent}${path}`,
    data: store.summaries[flatList ? path : `${parent}${path}`] ?? {},
  }));

  if (route.query.burndown == "true") {
    const countMisses = x => {
      let total = 0;
      let misses = 0;
      for (let t of Object.values(x.data)) {
        total += t.total;
        misses += t.total - t.hits;
      }
      // We want to put files without coverage at the end
      return total > 0 ? misses : -1;
    }
    // sort by number of misses, descending
    return td.sort((a, b) => countMisses(b) - countMisses(a));
  }

  return td.sort((a,b) => {
    if (a.kind !== b.kind) {
      // Show directories before files
      return a.kind === "file" ? 1 : -1;
    }
    // sort alphabetically otherwise
    return a.name.localeCompare(b.name);
  });
});

const isItemInteractible = (item) => item.kind !== "file" || store.hasSources;

const pathClickCallback = (item) => {
  if (isItemInteractible(item)) {
    router.push({
      path: `/${encodeURIComponent(item.path)}`,
      query: route.query,
    });
  }
}

const hitCountText = (item) => {
  // Only show 'N/A' for `hits` if the property doesn't exist or both `hits` and `total` are 0-ish
  if (!('hits' in item) || (item.hits === 0 && (item?.total ?? 0) === 0)) {
    return 'N/A'
  }
  return item.hits;
}

function shouldShowEntry(item) {
  return route.query.hideNotCovered != "true" || coverageTypes.value.some(type => item.data[type].total > 0)
}

</script>

<template>
  <div class="table-container">
    <table>
      <thead>
        <tr class="header-groups">
          <th></th>
          <th colspan="3" class="group-header" v-for="name in coverageTypes">{{ name }}</th>
        </tr>
        <tr>
          <th class="source-column">
            Source
          </th>
          <template v-for="_ in coverageTypes">
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
        <template v-for="item in tableData" >
          <tr :class="{ link: isItemInteractible(item) }" @click="pathClickCallback(item)" v-if="shouldShowEntry(item)" :key="item.path">
            <td class="name">
              <img v-if="item.kind === 'file'" src="../assets/file.svg" alt="file" />
              <img v-else src="../assets/module.svg" alt="module" />
              {{ item.name }}
            </td>
            <template v-for="name in coverageTypes">
              <td class="rate-cell">
                <div class="progress-wrapper">
                  <div class="progress-container">
                    <div
                      class="progress-bar"
                      :style="{
                        width: `${getRate(item.data[name])}%`,
                        backgroundColor: getRateColor(getRate(item.data[name]), false, store.hiddenCoverageTypes[name]),
                      }"
                    ></div>
                  </div>
                  <span class="rate-value" :style="{ color: getRateColor(getRate(item.data[name]), false, store.hiddenCoverageTypes[name]) }"> {{ getRate(item.data[name]) }}% </span>
                </div>
              </td>
              <td class="hit-cell">{{ hitCountText(item.data[name]) }}</td>
              <td class="total-cell">{{ item.data[name]?.total || 'N/A' }}</td>
            </template>
          </tr>
        </template>
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

tr.link:hover {
  background-color: var(--border-primary);
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