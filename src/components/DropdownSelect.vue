<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// TODO this ended up being complicated, see if this component cannot be simplified

const props = defineProps({
  options: Array,
  modelValue: String,
  label: String,
  wide: Boolean,
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const dropdownRef = ref(null);

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));

const selectOption = (option) => {
  emit('update:modelValue', option);
  isOpen.value = false;
};
</script>

<template>
  <div class="dropdown" :class="{ wide }" ref="dropdownRef">
    <button
      type="button"
      class="dropdown-trigger"
      @click="isOpen = !isOpen"
      :aria-expanded="isOpen"
      :title="modelValue || label"
    >
      <span class="dropdown-label">{{ modelValue || label }}</span>
      <svg class="arrow" :class="{ 'arrow-open': isOpen }" viewBox="0 0 24 24">
        <path d="M6 9L12 15L18 9" />
      </svg>
    </button>

    <transition
      enter-active-class="animate-in"
      leave-active-class="animate-out"
    >
      <div v-if="isOpen" class="dropdown-content">
        <button
          v-for="option in options"
          :key="option"
          class="dropdown-item"
          @click="selectOption(option)"
          :class="{ 'selected': option === modelValue }"
          :title="option"
        >
          {{ option }}
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: 0.5rem 2rem 0.5rem 0.5rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100px;
}

.dropdown-label {
  white-space: nowrap;
}

.dropdown.wide {
  max-width: min(36rem, 100%);
}

.dropdown.wide .dropdown-trigger {
  width: auto;
  min-width: 16rem;
}

.dropdown-trigger:hover {
  border-color: var(--border-hover);
}

.arrow {
  position: absolute;
  right: 0.5rem;
  width: 1.25rem;
  height: 1.25rem;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
  transform: rotate(0deg);
  transition: transform 0.2s ease;
}

.arrow-open {
  transform: rotate(180deg);
}

.dropdown-content {
  width: max-content;
  min-width: 100%;
  max-width: min(40rem, 90vw);
  max-height: 20rem;
  overflow: auto;
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  z-index: 50;
}

.dropdown-item {
  width: 100%;
  padding: 0.5rem;
  text-align: left;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.8rem;
}

.dropdown-item:hover {
  background: var(--bg-secondary);
}

.dropdown-item.selected {
  color: var(--text-primary);
}

.animate-in {
  animation: slideDown 0.1s ease-out;
}

.animate-out {
  animation: slideUp 0.1s ease-out;
}

@keyframes slideDown {
  from { transform: translateY(-0.5rem); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-0.5rem); opacity: 0; }
}

@media (max-width: 768px) {
  .dropdown-trigger {
      font-size: 0.875rem;
      padding: 0.375rem 2rem 0.375rem 0.375rem;
  }
}
</style>
