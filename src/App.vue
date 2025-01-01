<script setup>
import All from './components/All.vue';
</script>
<template v-cloak>
  <Suspense>
    <All></All>
    <template #fallback>
      Loading...
    </template>
  </Suspense>
</template>

<style>
[v-cloak] { display: none; }
</style>