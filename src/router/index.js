import { createRouter, createWebHashHistory } from "vue-router";
import ListView from "../views/ListView.vue";
import TreeView from "../views/TreeView.vue";
import FileDetailsView from "../views/FileDetailsView.vue";
import { store } from '../store.js';

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
    },
    {
      path: "/:moduleName",
      component: ListView,
      beforeEnter: async (to, _) => {
        await store.loaded;
        if (!store.modules[to.params.moduleName]) {
          console.log(`Aborting navigation to ${to.params.moduleName} module, as it's not available in the data.`);
          return false;
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
      path: "/:moduleName/:fileName",
      component: FileDetailsView,
      beforeEnter: async (to, _) => {
        await store.loaded;
        if (!store.modules[to.params.moduleName] || !store.modules[to.params.moduleName].files[to.params.fileName]) {
          console.log(`Aborting navigation to ${to.params.fileName}, as it's not available in the data.`);
          return false;
        }
        return true;
      },
    }
  ],
});

export default router;
