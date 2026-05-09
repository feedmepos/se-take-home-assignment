import { createRouter, createWebHistory } from 'vue-router'
import OrderManagementView from '@/views/OrderManagementView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'order-management',
      component: OrderManagementView
    }
  ]
})

export default router
