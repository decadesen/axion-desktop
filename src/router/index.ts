import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";
import HomePage from "../pages/HomePage.vue";
import SettingsPage from "../pages/SettingsPage.vue";
import TaskPage from "../pages/TaskPage.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: HomePage,
  },
  {
    path: "/settings",
    name: "settings",
    component: SettingsPage,
  },
  {
    path: "/tasks/:taskType?",
    name: "task",
    component: TaskPage,
  },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
