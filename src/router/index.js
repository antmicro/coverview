import { createRouter, createWebHashHistory } from "vue-router";
import ListView from "../views/ListView.vue";
import TreeView from "../views/TreeView.vue";
import TestView from "../views/TestView.vue";
import FileDetailsView from "../views/FileDetailsView.vue";
import NotFoundView from "../views/NotFoundView.vue";
import { loadData, store } from '../store.js';

function loadSelectedDataset(dataset) {
  if (dataset && store.selected_dataset !== dataset) {
    store.selected_dataset = dataset;
    loadData(store.files);
  }
}

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash,
      }
    }
  },
  routes: [
    {
      path: "/",
      component: ListView,
      beforeEnter: async (to, _) => {
        await store.loaded;
        loadSelectedDataset(to.query.dataset);
      }
    },
    {
      path: "/:moduleName",
      component: ListView,
      beforeEnter: async (to, _) => {
        await store.loaded;
        loadSelectedDataset(to.query.dataset);
        if (!store.modules[to.params.moduleName]) {
          return { name: 'NotFoundView' };
        }
        return true;
      },
    },
    {
      path: "/tree",
      component: TreeView,
    },
    {
      path: "/burndown",
      component: ListView,
      props: { burndown: true }
    },
    {
      path: "/tests",
      component: TestView
    },
    {
      path: "/:moduleName/:fileName",
      component: FileDetailsView,
      beforeEnter: async (to, _) => {
        await store.loaded;
        loadSelectedDataset(to.query.dataset);
        if (!store.modules[to.params.moduleName] || !store.modules[to.params.moduleName].files[to.params.fileName]) {
          return { name: 'NotFoundView' };
        }
        return true;
      },
    },
    {
      path: '/404',
      name: 'NotFoundView',
      component: NotFoundView
    }
  ],
});

export default router;
