import { createRouter, createWebHashHistory } from "vue-router";
import TreeView from "../views/TreeView.vue";
import TestView from "../views/TestView.vue";
import NotFoundView from "../views/NotFoundView.vue";
import PathView from "../views/PathView.vue";
import TableView from "../views/TableView.vue";
import { pathType, store, selectDataset, selectInstance } from '../store.js';

function applyQuerySelection(to) {
  selectDataset(to.query.dataset);
  selectInstance(typeof to.query.instance === 'string' ? to.query.instance : '');
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
      component: PathView,
      beforeEnter: async (to, _) => {
        await store.loaded;
        applyQuerySelection(to);
      }
    },
    {
      path: "/:path",
      component: PathView,
      props: true,
      beforeEnter: async (to, _) => {
        await store.loaded;
        applyQuerySelection(to);
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
    },
    {
      path: "/tables",
      component: TableView,
      beforeEnter: async (to, _) => {
        await store.loaded;
        applyQuerySelection(to);
      }
    }
  ],
});

export default router;
