<script setup>
import { store } from '../store.js';
</script>

<template>
  <div class="table-container">
    <table>
      <thead>
        <tr><th>#</th><th>Test group name</th><th>Status</th></tr>
      </thead>
      <tbody>
        <template v-for="(item, index) in store.tests">
            <tr>
              <td>{{ index+1 }}</td>
              <td>{{ item }}</td>
              <td class="success">OK</td>
            </tr>
          </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
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

.table-container > table > tbody > tr:hover {
  background-color: var(--border-primary);
}

.success {
  color: rgb(42, 181, 82);
}

@media (max-width: 768px) {
  th,
  td {
    padding: 8px;
  }
}

@media (max-width: 640px) {
  th,
  td {
    padding: 6px;
    font-size: 14px;
  }
}
</style>