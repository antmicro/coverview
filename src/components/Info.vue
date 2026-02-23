<script setup>
import Summary from "../components/Summary.vue";
import DropdownSelect from "./DropdownSelect.vue";
import { store, selectDataset, pathType, hasTableForFile } from "../store.js";
import router from "../router/index.js";
import { computed, onBeforeUnmount, ref } from "vue";
import { useRoute } from "vue-router";

const props = defineProps({
  timestamp: String,
  path: String,
});

const route = useRoute();

function onDatasetChange(value) {
  selectDataset(value);
  const query = Object.assign({}, route.query);
  query.dataset = store.selectedDataset;
  router.replace({ query: query });
}

const pathKind = computed(() => pathType(props.path));
const hasTables = computed(() => hasTableForFile(props.path));
const titleText = computed(
  () =>
    (props.path
      ? props.path.split("/").pop()
      : store.metadata.repo?.split("/").pop()) || "Overview",
);
const canCopyPath = computed(() => pathKind.value === "file" && !!props.path);
const tableVisible = ref(
  hasTables && (route.query?.showTable?.toLowerCase() === "true" ?? false),
);
const copyState = ref("idle");
const copyButtonLabel = computed(() =>
  copyState.value === "copied" ? "Copied file path" : "Copy file path",
);
let copyStateTimer;

const copyWithExecCommand = (text) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
};

const copyCurrentPath = async () => {
  if (!canCopyPath.value) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.path);
    } else if (!copyWithExecCommand(props.path)) {
      throw new Error("Clipboard API unavailable");
    }
    copyState.value = "copied";
  } catch (_) {
    copyState.value = "idle";
  }

  window.clearTimeout(copyStateTimer);
  copyStateTimer = window.setTimeout(() => {
    copyState.value = "idle";
  }, 1600);
};

const toggleTables = () => {
  tableVisible.value = !tableVisible.value;
  router.replace({ query: { ...route.query, showTable: tableVisible.value } });
};

onBeforeUnmount(() => {
  window.clearTimeout(copyStateTimer);
});
</script>

<template>
  <div class="info-section">
    <div class="info-header">
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
            <span class="title-icon">
              <img src="../assets/file.svg" v-if="pathKind === 'file'" />
              <img src="../assets/module.svg" v-else-if="pathKind === 'dir'" />
              <img src="../assets/repo.svg" v-else-if="store.metadata.repo" />
            </span>
            <span class="info-title-text">{{ titleText }}</span>
            <button
              v-if="canCopyPath"
              type="button"
              class="copy-path-button"
              :class="{ copied: copyState === 'copied' }"
              :title="copyButtonLabel"
              :aria-label="copyButtonLabel"
              @click.stop="copyCurrentPath"
            >
              <svg v-if="copyState === 'copied'" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3.5 8.5L6.5 11.5L12.5 4.5"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg v-else viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="5" y="2.5" width="8.5" height="10.5" rx="1.5" stroke="currentColor" stroke-width="1.2" />
                <path
                  d="M10.5 13.5H3.5C2.95 13.5 2.5 13.05 2.5 12.5V4.5C2.5 3.95 2.95 3.5 3.5 3.5H5"
                  stroke="currentColor"
                  stroke-width="1.2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
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

<style>
.info-section {
  position: sticky;
  top: 0;
  z-index: 99999;
  background: var(--bg-primary);
  padding: 3rem 0rem 2rem;
  border-bottom: 1px solid var(--border-primary);
  display: flex;
}

.info-header {
  width: 80%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  line-height: 1.2;
}

.metadata-item {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.info-title-text {
  overflow-wrap: anywhere;
}

.title-icon img {
  width: 1.25rem;
  height: 1.25rem;
}

.copy-path-button {
  width: 1.7rem;
  height: 1.7rem;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-path-button:hover {
  border-color: var(--accent-border);
  color: var(--text-primary);
  background: var(--accent-background);
}

.copy-path-button:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.copy-path-button.copied {
  border-color: var(--accent-border);
  color: var(--accent-primary);
}

.copy-path-button svg {
  width: 0.95rem;
  height: 0.95rem;
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
    padding: 1.5rem 0.75rem 1rem;
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

.info-section {
  padding: 1rem 0;
}

.title-metadata {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}
</style>
