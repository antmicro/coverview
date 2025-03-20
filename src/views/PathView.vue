<script setup>
import { computed } from 'vue';
import { pathType } from '../store';
import FileDetailsView from './FileDetailsView.vue';
import ListView from './ListView.vue';

const props = defineProps({
    path: String,
});

const pathKind = computed(() => pathType(props.path));

</script>
<template>
    <FileDetailsView :file-name="props.path" v-if="pathKind === 'file'"></FileDetailsView>
    <ListView :module-path="props.path" v-else></ListView>
</template>
