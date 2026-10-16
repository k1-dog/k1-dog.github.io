<script setup>
import DefaultTheme from 'vitepress/theme'
import { ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vitepress'
import M9Storm from '@k1/ui-lib/Spin/Storm'
import { isSidebarCollapsed, toggleSidebar } from './sidebar-collapse.js'

const DefaultLayout = DefaultTheme.Layout

const toggleTitle = computed(() => (isSidebarCollapsed.value ? '展开侧边栏' : '收起侧边栏'))
const toggleIcon = computed(() => (isSidebarCollapsed.value ? '▶' : '◀'))

// —— route-transition storm mask ——

const route = useRoute()
const router = useRouter()
const storming = ref(false)
const stormHostRef = ref(null)

if (!import.meta.env.SSR) {
  // pin the storm host over the whole right-hand content block —
  // everything right of the sidebar and below the nav bar (page title,
  // body, right-side outline); measured from the live chrome elements so
  // sidebar collapse / reflow is captured; sync runs only on route
  // transitions, the only moments the mask is visible
  const syncRect = () => {
    const host = stormHostRef.value
    if (!host) return
    const nav = document.querySelector('.VPNavBar')
    const sidebar = document.querySelector('.VPSidebar')
    const top = nav ? nav.getBoundingClientRect().bottom : 0
    const left = sidebar ? sidebar.getBoundingClientRect().right : 0
    host.style.top = `${top}px`
    host.style.left = `${left}px`
    host.style.width = `${window.innerWidth - left}px`
    host.style.height = `${window.innerHeight - top}px`
  }

  // menu click → storm on; the storm stays until closed manually via
  // the floating toggle — it never auto-hides after the page is ready
  router.onBeforeRouteChange = (to) => {
    if (to !== route.path) {
      storming.value = true
      nextTick(syncRect)
    }
  }
  router.onAfterRouteChanged = () => {
    nextTick(syncRect)
  }
}
</script>

<template>
  <DefaultLayout>
    <template #nav-bar-content-after>
      <button
        class="k1-side-toggle"
        :title="toggleTitle"
        :aria-label="toggleTitle"
        @click="toggleSidebar"
      >
        {{ toggleIcon }}
      </button>
    </template>
    <template #layout-top>
      <!-- single depth-of-field veil — one full-screen blurred backdrop
           wrapping the storm host: the nav bar and sidebar blur away
           behind it while the storm scene (z:40) stays sharp on top -->
      <div v-show="storming" class="k1-storm-blur">
        <div ref="stormHostRef" class="k1-storm-host">
        <M9Storm :spinning="storming" text="加载中" />
        <button
          v-show="storming"
          class="k1-storm-close"
          title="关闭过场动画"
          @click="storming = false"
        >
          ✕ 关闭过场
        </button>
        </div>
      </div>
    </template>
  </DefaultLayout>
</template>