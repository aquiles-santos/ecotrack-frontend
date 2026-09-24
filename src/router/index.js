import { createRouter, createWebHistory } from 'vue-router';

import AlertsView from '@/views/AlertsView.vue';
import DashboardView from '@/views/DashboardView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/alerts',
      name: 'alerts',
      component: AlertsView,
    },
  ],
});

export default router;
