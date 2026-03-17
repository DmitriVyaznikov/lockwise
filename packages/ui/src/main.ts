import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './assets/main.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('./pages/DashboardPage.vue'),
    },
  ],
});

const app = createApp(App);
app.use(router);
app.mount('#app');
