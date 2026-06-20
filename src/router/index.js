import { createRouter, createWebHistory } from 'vue-router'
import VhostHttpConfig from '@/views/VhostHttpConfig.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'vhost-http',
      component: VhostHttpConfig,
    },
  ],
})

export default router
