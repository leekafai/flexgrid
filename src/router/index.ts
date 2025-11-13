import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import TestPage from '@/pages/TestPage.vue'
import TestFGrid from '@/pages/TestFGrid.vue'
import TestPGrid from '@/pages/TestPGrid.vue'

// 定义路由配置
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/test',
    name: 'test',
    component: TestPage,
  },
  {
    path: '/test-f-grid',
    name: 'test-f-grid',
    component: TestFGrid,
  },
  {
    path: '/test-p-grid',
    name: 'test-p-grid',
    component: TestPGrid,
  },
  {
    path: '/about',
    name: 'about',
    component: {
      template: '<div class="text-center text-xl p-8">About Page - Coming Soon</div>',
    },
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
