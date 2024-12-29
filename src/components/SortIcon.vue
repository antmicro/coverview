<script setup>
const props = defineProps(['isActive', 'sortOrder'])
</script>

<template>
  <div class="sort-icon" :class="{ active: isActive }">
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 7L8 3L12 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ highlighted: isActive && sortOrder === 'asc' }" />
      <path d="M4 13L8 17L12 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ highlighted: isActive && sortOrder === 'desc' }" />
    </svg>
  </div>
</template>

<style scoped>
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
}

@media (max-width: 768px) {
  .sort-icon {
    display: none;
  }
}
</style>
