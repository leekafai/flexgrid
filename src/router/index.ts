import { createRouter, createWebHistory } from 'vue-router'
import TestPGrid from '@/pages/TestPGrid.vue'

// 定义路由配置
const routes = [
  {
    path: '/',
    name: 'home',
    component: TestPGrid,
  },
  {
    path: '/test',
    name: 'test',
    component: TestPGrid,
  },
  {
    path: '/test-f-grid',
    name: 'test-f-grid',
    component: TestPGrid,
  },
  {
    path: '/test-p-grid',
    name: 'test-p-grid',
    component: TestPGrid,
  },
  {
    path: '/home',
    name: 'home-original',
    component: TestPGrid,
  },
  {
    path: '/about',
    name: 'about',
    redirect: '/',
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
