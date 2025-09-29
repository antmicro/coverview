<script setup>
import { store } from '../store';

const props = defineProps({
  filePath: String,
});

// Show tables for all files if none are specified
const tableData = props.filePath ? { [props.filePath]: store.tables[props.filePath] } : store.tables;
</script>


<template>
  <div class="wrapper">
    <main>
      <template v-for="[path, fileGroups] in Object.entries(tableData)">
        <table>
          <thead>
            <tr>
              <th>{{ path }}</th>
              <th style="text-align: center;">Hit count</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="[name, groups] in Object.entries(fileGroups.lines[0].groups)">
              <tr>
                <th>{{ name }}</th>
              </tr>
              <template v-for="[groupName, data] in Object.entries(groups.subGroups)">
                <tr :class="data.value > 0 ? 'dimmed-green-row' : 'dimmed-red-row'">
                  <td class="group-name">{{ groupName }}</td>
                  <td style="text-align: center;" class="hit-count">{{ data.value }}</td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </template>
    </main>
  </div>
</template>

<style scoped>
.wrapper {
  position: relative;
  width: 100%;
}

main {
  max-width: 100%;
}

table {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  table-layout: auto;
  width: 100%;
  margin-bottom: 2rem;
}


th {
  text-align: left;
  color: var(--text-primary);
  font-size: 0.875rem;
}

th, td {
  white-space: pre-wrap;
  padding: 0rem 0.3rem;
}

td {
  vertical-align: top;
  padding: 0rem 0.5rem;
}


td:first-of-type {
  color: var(--text-primary);
  padding: 2px 0.5rem;
  font-size: 12px;
}


.dimmed-green-row {
  background: var(--accent-background);
}
.dimmed-red-row {
  background: var(--danger-background);
}
.group-name {
  color: var(--text-muted);
}
.hit-count {
  color: var(--accent-primary);
  width: 120px;
  text-align: right;
  white-space: nowrap;
}
.dimmed-red-row .hit-count {
  color: var(--danger-primary);
}

@media (min-width: 1280px) {
  main {
    overflow: visible;
  }
  table {
    white-space: pre-wrap;
    width: 100%;
  }
}

@media (max-width: 1279px) {
  main {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  main::-webkit-scrollbar {
    display: none;
  }
  table {
    table-layout: auto;
    white-space: nowrap;
    width: 100%;
  }
}
</style>
