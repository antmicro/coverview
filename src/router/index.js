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
      beforeEnter: (to, _) => {
        if (!store.modules[to.params.moduleName]) {
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
      beforeEnter: (to, _) => {
        if (!store.modules[to.params.moduleName] || !store.modules[to.params.moduleName].files[to.params.fileName]) {
          return false;
        }
        return true;
      },
    }
  ],
});

export default router;
