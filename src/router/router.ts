import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import OrderBoard from '../views/OrderBoard.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'OrderBoard',
    component: OrderBoard,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
  {
    path: '/:pathMatch(.*)*',
    name: '404',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
