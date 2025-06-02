import { createRouter, createWebHashHistory } from "vue-router";
import ListView from "../views/ListView.vue";
import TreeView from "../views/TreeView.vue";
import TestView from "../views/TestView.vue";
import NotFoundView from "../views/NotFoundView.vue";
import PathView from "../views/PathView.vue";
import { pathType, store, selectDataset } from '../store.js';

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
      component: PathView,
      beforeEnter: async (to, _) => {
        await store.loaded;
        selectDataset(to.query.dataset);
      }
    },
    {
      path: "/:path",
      component: PathView,
      props: true,
      beforeEnter: async (to, _) => {
        await store.loaded;
        selectDataset(to.query.dataset);
        return pathType(to.params.path) ? true : { name: 'NotFoundView' };
      },
    },
    {
      path: "/tree",
      component: TreeView,
    },
    {
      path: "/tests",
      component: TestView
    },
    {
      path: '/404',
      name: 'NotFoundView',
      component: NotFoundView
    }
  ],
});

export default router;
