import { createRouter, createWebHashHistory } from "vue-router";
import ListView from "../views/ListView.vue";
import TreeView from "../views/TreeView.vue";
import FileDetailsView from "../views/FileDetailsView.vue";
import NotFoundView from "../views/NotFoundView.vue";
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
      path: "/:moduleName/:fileName",
      component: FileDetailsView,
      beforeEnter: async (to, _) => {
        await store.loaded;
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
