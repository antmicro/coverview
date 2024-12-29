import { createRouter, createWebHashHistory } from "vue-router";
import ListView from "../views/ListView.vue";
import TreeView from "../views/TreeView.vue";
import FileDetailsView from "../views/FileDetailsView.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: ListView,
    },
    {
      path: "/:moduleName",
      component: ListView,
    },
    {
      path: "/tree",
      component: TreeView,
    },
    {
      path: "/:moduleName/:fileName",
      component: FileDetailsView,
    }
  ],
});

export default router;
