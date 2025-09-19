<script setup>
import { store } from '../store';
</script>

<template>
  <template v-for="[path, fileGroups] in Object.entries(store.tables)">
    <table>
      <thead>
        <tr>
          <th>{{ path }}</th>
          <th>Hit count</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="[name, groups] in Object.entries(fileGroups.lines[0].groups)">
          <tr>
            <th>{{ name }}</th>
          </tr>
          <template v-for="[groupName, data] in Object.entries(groups.subGroups)">
            <tr>
              <td>{{ groupName }}</td>
              <td :class="data.value > 0 ? 'dimmed-green' : 'dimmed-red'">{{ data.value }}</td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>
  </template>

</template>
