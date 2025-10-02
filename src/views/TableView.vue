<script setup>
import { useRoute, useRouter } from 'vue-router';
import { getRate, getRateColor, store } from '../store';
import { computed, onMounted } from 'vue';

const props = defineProps({
  filePath: String,
});

const router = useRouter();
const route = useRoute();

// Show tables for all files if none are specified
const tableData = computed(() => props.filePath ? { [props.filePath]: store?.tables[props.filePath] ?? {} } : store?.tables ?? {});

const clearHighlight = () => document.querySelectorAll('.highlighted-line').forEach(el => el.classList.remove('highlighted-line'));

const highlightLine = (e) => {
  clearHighlight();
  const eventTarget = e.currentTarget;
  eventTarget.classList.add('highlighted-line');
  const clickTarget = eventTarget.querySelector('.click-target')
  router.replace({ hash: `#${clickTarget.id}`, query: route.query });
}

onMounted(async () => {
  if (route.hash) {
    clearHighlight();

    // Remove the leading `#`
    const el = document.getElementById(route.hash.substring(1))
    if (el) {
      const parent = el.closest('.highlight-target');
      parent.classList.add('highlighted-line');
    }
  }
});
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
            <template v-for="[name, groups] in Object.entries(fileGroups.lines[0].groups)" :key="name">
              <tr :set="[hits, total] = groups.stats" class="highlight-target" @click="highlightLine">
                <th>
                  {{ name }}
                  <span class="click-target" style="margin-top: -300px; position: absolute;" :id="name.replaceAll(' ', '_')"></span>
                </th>
                <th :style="{ textAlign: 'center', backgroundColor: getRateColor(getRate({ hits, total }), true) }">
                  {{ hits }} / {{ total }}
                </th>
              </tr>
              <template v-for="[groupName, data] in Object.entries(groups.subGroups)" :key="groupName">
                <tr :class="`highlight-target ${data.value > 0 ? 'dimmed-green-row' : 'dimmed-red-row'}`" @click="highlightLine">
                  <td class="group-name">
                    {{ groupName }}
                    <span class="click-target" style="margin-top: -300px; position: absolute;" :id="`${name}.${groupName}`.replaceAll(' ', '_')"></span>
                  </td>
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

.highlight-target {
  cursor: pointer;
}

.highlight-target.highlighted-line {
  background-color: rgba(var(--accent-primary-rgb, 0, 120, 215), 0.15);
  filter: brightness(1.3);
  border: 1px solid rgba(var(--accent-primary-rgb, 0, 120, 215), 0.4);
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
