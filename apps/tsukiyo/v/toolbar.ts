/**
 * v/toolbar — 画布右缘的竖条工具栏：evolve 开关、绘制状态（引擎变更即推送——
 * 从不轮询、不做保活探针）、收起、版本历史；纯 DOM、tick 管线之外
 */
import type { TsuStatus } from '../yomi'
import type { EvoVersion } from './evolve'
import { TOOLBAR, EVOLVE } from '../helper/const'

/** 引擎钩子 — 工具栏所需的一切、不越界直取 */
export interface ToolbarHost {
  status(): TsuStatus
  statusDetail(): { status: TsuStatus; sched: string; slots: number; growing: number }
  onStatus($cb: ($s: TsuStatus) => void): () => void
  evolveSupported(): boolean
  evolving(): boolean
  toggleEvolve(): void
  versions(): EvoVersion[]
  rollback($i: number): void
  /** evolve 暂存 — 驱动 ✓ 确认 / ✗ 丢弃条 */
  staged(): boolean
  confirmStaged(): void
  discardStaged(): void
}

/** 内联 svg 图标（feather 风格、stroke currentColor） */
function iconSvg($paths: string): string {
  return `<svg width="${TOOLBAR.svgSize}" height="${TOOLBAR.svgSize}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${$paths}</svg>`
}

const ICONS = {
  evolve: iconSvg('<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>'),
  status: iconSvg('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
  history: iconSvg('<path d="M3 3v5h5"/><path d="M3.05 13a9 9 0 1 0 2.13-5.36L3 8"/><path d="M12 7v5l4 2"/>'),
  collapse: iconSvg('<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>'),
  expand: iconSvg('<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>'),
}

export class TsuToolbar {
  private host: ToolbarHost
  private root: HTMLDivElement
  private btnEvolve: HTMLButtonElement
  private btnStatus: HTMLButtonElement
  private btnHistory: HTMLButtonElement
  private btnCollapse: HTMLButtonElement
  private dot: HTMLDivElement
  private card: HTMLDivElement | null = null
  private cardOpen: 'status' | 'history' | null = null
  private collapsed = false
  /** ✓ 确认 / ✗ 丢弃条 — 仅暂存期间可见 */
  private confirmBar: HTMLDivElement
  private offStatus: () => void
  /** 版本缩略图预览 — 跟随 hover 的历史行 */
  private preview: HTMLDivElement | null = null
  private onDocClick: (($e: MouseEvent) => void) | null = null

  constructor($canvas: HTMLCanvasElement, $host: ToolbarHost) {
    this.host = $host

    const mk = ($icon: string, $title: string): HTMLButtonElement => {
      const b = document.createElement('button')
      b.style.cssText = TOOLBAR.btnCssText
      b.title = $title
      b.innerHTML = $icon
      return b
    }
    this.btnEvolve = mk(ICONS.evolve, '月读演进')
    this.btnStatus = mk(ICONS.status, '月读状态')
    this.btnHistory = mk(ICONS.history, '版本历史')
    this.btnCollapse = mk(ICONS.collapse, '收起')

    this.dot = document.createElement('div')
    this.dot.style.cssText = TOOLBAR.dotCssText
    this.btnStatus.appendChild(this.dot)

    this.root = document.createElement('div')
    this.root.className = 'tsukiyo-toolbar'
    this.root.style.cssText = TOOLBAR.cssText
    this.root.appendChild(this.btnEvolve)
    this.root.appendChild(this.btnStatus)
    this.root.appendChild(this.btnHistory)
    this.root.appendChild(this.btnCollapse)

    // ✓ 确认 / ✗ 丢弃 — 暂存仅有的两条出路
    this.confirmBar = document.createElement('div')
    this.confirmBar.style.cssText = EVOLVE.confirmCssText
    const mkBar = ($text: string, $css: string, $on: () => void): HTMLButtonElement => {
      const b = document.createElement('button')
      b.style.cssText = EVOLVE.confirmBtnCssText + ';' + $css
      b.textContent = $text
      b.addEventListener('click', ($e) => { $e.stopPropagation(); $on() })
      this.confirmBar.appendChild(b)
      return b
    }
    mkBar('✓ 确认', 'color: #4caf50', () => { this.host.confirmStaged(); this.refreshConfirm() })
    mkBar('✗ 丢弃', 'color: #ff9800', () => { this.host.discardStaged(); this.refreshConfirm() })

    this.btnEvolve.addEventListener('click', ($e) => { $e.stopPropagation(); this.onEvolveClick() })
    this.btnStatus.addEventListener('click', ($e) => { $e.stopPropagation(); this.toggleCard('status') })
    this.btnHistory.addEventListener('click', ($e) => { $e.stopPropagation(); this.toggleCard('history') })
    this.btnCollapse.addEventListener('click', () => this.toggleCollapse())

    const parent = $canvas.parentElement
    if (parent) {
      if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative'
      parent.appendChild(this.root)
      parent.appendChild(this.confirmBar)
    }

    this.refreshEvolve()
    this.refreshConfirm()
    this.offStatus = this.host.onStatus(($s: TsuStatus) => this.onStatus($s))
  }

  destroy(): void {
    this.offStatus()
    this.closeCard()
    this.confirmBar.remove()
    this.root.remove()
  }

  // —— 状态（变更即推送——从不轮询）———————————————————

  private onStatus($s: TsuStatus): void {
    this.dot.style.background = TOOLBAR.statusColors[$s]
    if (this.cardOpen === 'status') this.renderCard()
  }

  // —— evolve 开关 —————————————————————————————————————

  private onEvolveClick(): void {
    if (!this.host.evolveSupported() && !this.host.evolving()) return
    this.host.toggleEvolve()
    this.refreshEvolve()
    this.closeCard()
  }

  private refreshEvolve(): void {
    const on = this.host.evolving()
    const off = !this.host.evolveSupported()
    this.btnEvolve.style.cssText = TOOLBAR.btnCssText + ';' +
      (off ? TOOLBAR.btnOffCss : on ? TOOLBAR.btnActiveCss : '')
    this.btnHistory.style.display = on && !this.collapsed ? 'flex' : 'none'
  }

  /** 暂存变更推送（来自 evolve 域——从不轮询） */
  onStaged(): void {
    this.refreshConfirm()
  }

  private refreshConfirm(): void {
    this.confirmBar.style.display = this.host.staged() ? 'flex' : 'none'
  }

  // —— 卡片（状态详情 / 版本历史）——————————————————

  private toggleCard($kind: 'status' | 'history'): void {
    if (this.cardOpen === $kind) {
      this.closeCard()
      return
    }
    this.closeCard()
    const card = document.createElement('div')
    card.style.cssText = TOOLBAR.cardCssText
    this.root.parentElement?.appendChild(card)
    this.card = card
    this.cardOpen = $kind
    this.renderCard()
    this.onDocClick = ($e: MouseEvent) => {
      const t = $e.target as Node | null
      if (t && this.card && !this.card.contains(t) && !this.root.contains(t)) this.closeCard()
    }
    document.addEventListener('click', this.onDocClick)
  }

  private renderCard(): void {
    const card = this.card
    if (!card) return
    if (this.cardOpen === 'status') {
      const d = this.host.statusDetail()
      card.innerHTML =
        `<div style="font-weight:bold;margin-bottom:2px">${TOOLBAR.statusLabels[d.status]}</div>` +
        `<div>调度器：${d.sched}</div>` +
        `<div>槽位数：${d.slots}</div>` +
        `<div>生长中：${d.growing}</div>`
      return
    }
    const vs = this.host.versions()
    let _html = '<div style="font-weight:bold;margin-bottom:4px">版本历史（点击回滚）</div>'
    for (let _i = 0; _i < vs.length; _i++) {
      const active = _i === vs.length - 1 ? `;${TOOLBAR.itemActiveCss}` : ''
      _html += `<button data-v="${_i}" style="${TOOLBAR.itemCssText}${active}">${vs[_i].label}</button>`
    }
    if (vs.length === 0) _html += '<div>暂无版本</div>'
    card.innerHTML = _html
    card.querySelectorAll('button[data-v]').forEach(($b) => {
      const i = Number(($b as HTMLElement).dataset.v)
      $b.addEventListener('click', () => {
        this.host.rollback(i)
        this.closeCard()
      })
      // hover — 版本快照缩略图弹于卡片左侧
      $b.addEventListener('mouseenter', () => this.showPreview(vs[i], $b as HTMLElement))
      $b.addEventListener('mouseleave', () => this.hidePreview())
    })
  }

  private showPreview($v: EvoVersion, $btn: HTMLElement): void {
    this.hidePreview()
    if (!$v.snap) return
    const p = this.root.parentElement
    const pr = p?.getBoundingClientRect()
    const br = $btn.getBoundingClientRect()
    if (!p || !pr) return
    const d = document.createElement('div')
    d.style.cssText = EVOLVE.previewCssText
    d.appendChild($v.snap)
    const label = document.createElement('div')
    label.textContent = $v.label
    d.appendChild(label)
    p.appendChild(d)
    d.style.left = `${Math.max(0, br.left - pr.left - d.offsetWidth - 8)}px`
    d.style.top = `${Math.max(0, br.top - pr.top - 8)}px`
    this.preview = d
  }

  private hidePreview(): void {
    this.preview?.remove()
    this.preview = null
  }

  private closeCard(): void {
    if (this.onDocClick) {
      document.removeEventListener('click', this.onDocClick)
      this.onDocClick = null
    }
    this.hidePreview()
    this.card?.remove()
    this.card = null
    this.cardOpen = null
  }

  // —— 收起 —————————————————————————————————————————

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed
    const show = this.collapsed ? 'none' : 'flex'
    this.btnEvolve.style.display = show
    this.btnStatus.style.display = show
    this.btnHistory.style.display = !this.collapsed && this.host.evolving() ? 'flex' : 'none'
    this.btnCollapse.innerHTML = this.collapsed ? ICONS.expand : ICONS.collapse
    this.btnCollapse.title = this.collapsed ? '展开' : '收起'
    if (this.collapsed) this.closeCard()
  }
}
