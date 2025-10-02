<script setup>
import { useRoute } from "vue-router";
import { computed } from 'vue';
import { hasTableForFile, pathType } from '../store';
import FileDetailsView from './FileDetailsView.vue';
import ListView from './ListView.vue';
import TableView from './TableView.vue';

const props = defineProps({
    path: String,
});

const route = useRoute();

const pathKind = computed(() => {
    if (hasTableForFile(props.path) && ((route.query?.showTable?.toLowerCase() === "true") ?? false)) {
        return "table"
    }
    return pathType(props.path);
});

</script>
<template>
    <TableView :file-path="props.path" v-if="pathKind === 'table'"></TableView>
    <FileDetailsView :file-name="props.path" v-else-if="pathKind === 'file'"></FileDetailsView>
    <ListView :module-path="props.path" v-else></ListView>
</template>
