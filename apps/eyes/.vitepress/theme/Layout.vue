<script setup>
import DefaultTheme from 'vitepress/theme'
import { computed } from 'vue'
import { isSidebarCollapsed, toggleSidebar } from './sidebar-collapse.js'

const DefaultLayout = DefaultTheme.Layout

const toggleTitle = computed(() => (isSidebarCollapsed.value ? '展开侧边栏' : '收起侧边栏'))
const toggleIcon = computed(() => (isSidebarCollapsed.value ? '▶' : '◀'))
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
  </DefaultLayout>
</template>