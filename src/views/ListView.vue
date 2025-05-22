<script setup>
import { store, getRateColor, getRate, availableCoverageTypes, getPathChildren, pathType } from '../store.js';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import router from '../router/index.js';

const props = defineProps({
  burndown: Boolean,
  modulePath: String,
});

const route = useRoute()
const modulePath = computed(() => props.modulePath ?? "");
const coverageTypes = computed(() => availableCoverageTypes());

const tableData = computed(() => {
  const td = [];
  if (props.burndown) {
    const countMisses = x => {
      let misses = 0;
      for (let t of Object.values(x.data)) {
        misses += t.total - t.hits;
      }
      return misses;
    }

    for (const path of Object.keys(store.files)) {
      td.push({
        name: path,
        path: path,
        data: store.summaries[path] ?? {},
      });
    }

    // sort by number of misses, descending
    return td.sort((a, b) => countMisses(b) - countMisses(a));
  }

  const parent = modulePath.value ? `${modulePath.value}/` : '';
  for (const child of getPathChildren(parent)) {
    const fullPath = `${parent}${child}`;
    td.push({
      name: child,
      path: fullPath,
      data: store.summaries[fullPath] ?? {},
    });
  }

  return td.sort((a,b) => {
    const aType = pathType(a.path);
    const bType = pathType(b.path);
    if (aType !== bType) {
      // Show directories before files
      return aType === "file" ? 1 : -1;
    }
    // sort alphabetically otherwise
    return a.name.localeCompare(b.name);
  });
});

const buildRoute = (target) => {
  return {
    path: `/${encodeURIComponent(target)}`,
    query: route.query
  }
}

const hitCountText = (item) => {
  // Only show 'N/A' for `hits` if the property doesn't exist or both `hits` and `total` are 0-ish
  if (!('hits' in item) || (item.hits === 0 && (item?.total ?? 0) === 0)) {
    return 'N/A'
  }
  return item.hits;
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
        <tr class="link" @click="router.push(buildRoute(item.path))" v-for="item in tableData" :key="item.path">
          <td class="name">
            <img v-if="pathType(item.path) === 'file'" src="../assets/file.svg" alt="file" />
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