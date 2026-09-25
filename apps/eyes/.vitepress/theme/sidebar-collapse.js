import { ref } from 'vue'

// Sidebar collapse state for the whole sidebar panel (desktop custom feature).
// Persisted in localStorage so the collapsed state survives navigation / refresh.

const STORAGE_KEY = 'm9-eyes-sidebar-collapsed'

// Reactive state shared across Layout.vue (toggling) and CSS class application
export const isSidebarCollapsed = ref(false)

export function initSidebarCollapse() {
  if (typeof window === 'undefined') return
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    isSidebarCollapsed.value = saved === '1'
  } catch (e) {
    // localStorage may be unavailable in some contexts; keep default expanded
  }
  applySidebarCollapsedClass()
}

export function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  try {
    window.localStorage.setItem(STORAGE_KEY, isSidebarCollapsed.value ? '1' : '0')
  } catch (e) {
    // ignore persistence errors
  }
  applySidebarCollapsedClass()
}

function applySidebarCollapsedClass() {
  const root = document.documentElement
  root.classList.toggle('vp-sidebar-collapsed', isSidebarCollapsed.value)
}