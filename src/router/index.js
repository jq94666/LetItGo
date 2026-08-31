import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  // 使用 hash 模式，原生刷新/静态部署均不会 404
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/home/index.vue') },
    { path: '/sites', name: 'sites', component: () => import('../views/sites/index.vue') },
    { path: '/tools', name: 'tools', component: () => import('../views/tools/index.vue') }
  ]
})

export default router