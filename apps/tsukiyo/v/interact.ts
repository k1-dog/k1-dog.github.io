/**
 * v/interact — 交互：hover 高亮 + click 聚焦、经 intake 投递（事件来自 tick 外、
 * 在一个 tick 内处理）；视口变化交给相机；命中测试交给空间域；hover/click 集存在 model 上
 */
import type { Vec2, CoordMapper } from '../yomi'
import type { TsuModel } from '../m/model'
import type { TsuSpace } from '../middleware/spatial'
import type { Scheduler } from '../middleware/scheduler'
import type { TsuDirty } from '../middleware/dirty'
import { TOOLTIP, ZOOM_STEP } from '../helper/const'
import { M9Drag1nWindow } from '@k1/utils'

interface Msg {
  type: 'move' | 'click' | 'leave' | 'wheel' | 'drag'
  pos: Vec2
  zoomDelta?: number
  dx?: number
  dy?: number
}

export class Interact {
  readonly taskName: string

  private canvas: HTMLCanvasElement
  private space: TsuSpace
  private model: TsuModel
  private camera: CoordMapper
  private dirty: TsuDirty
  private scheduler: Scheduler
  private coordTask: string
  private tip: HTMLDivElement | null = null

  private readonly onMove = ($e: MouseEvent): void => {
    this.scheduler.intake(this.taskName).feed({ type: 'move', pos: [$e.offsetX, $e.offsetY] })
  }
  private readonly onClick = ($e: MouseEvent): void => {
    this.scheduler.intake(this.taskName).feed({ type: 'click', pos: [$e.offsetX, $e.offsetY] })
  }
  private readonly onLeave = (): void => {
    this.scheduler.intake(this.taskName).feed({ type: 'leave', pos: [0, 0] })
  }
  private readonly onWheel = ($e: WheelEvent): void => {
    $e.preventDefault()
    this.scheduler.intake(this.taskName).feed({
      type: 'wheel', pos: [$e.offsetX, $e.offsetY],
      zoomDelta: -$e.deltaY * ZOOM_STEP,
    })
  }

  private dragX = 0
  private dragY = 0
  private unbindDrag: (() => void) | null = null

  constructor(
    $canvas: HTMLCanvasElement, $space: TsuSpace, $model: TsuModel, $camera: CoordMapper,
    $dirty: TsuDirty, $scheduler: Scheduler, $taskPrefix = '',
  ) {
    this.canvas = $canvas
    this.space = $space
    this.model = $model
    this.camera = $camera
    this.dirty = $dirty
    this.scheduler = $scheduler
    this.taskName = $taskPrefix + 'interact'
    this.coordTask = $taskPrefix + 'coord'
  }

  bind(): void {
    this.canvas.addEventListener('mousemove', this.onMove)
    this.canvas.addEventListener('click', this.onClick)
    this.canvas.addEventListener('mouseleave', this.onLeave)
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false })

    // 拖拽 — 窗口级追踪、偏移差以消息投递
    this.unbindDrag = M9Drag1nWindow(
      this.canvas,
      ($el: HTMLElement, $offset: { _x: number; _y: number }) => {
        this.scheduler.intake(this.taskName).feed({
          type: 'drag', pos: [0, 0],
          dx: $offset._x - this.dragX,
          dy: $offset._y - this.dragY,
        })
        this.dragX = $offset._x
        this.dragY = $offset._y
      },
      () => { this.dragX = 0; this.dragY = 0 },
      () => { this.dragX = 0; this.dragY = 0 },
    )

    // 常驻 — 排在 coord 之后、命中测试前位置已定
    this.scheduler.add(this.taskName, () => this.task(), { after: [this.coordTask], always: true })
    this.createTip()
  }

  unbind(): void {
    this.canvas.removeEventListener('mousemove', this.onMove)
    this.canvas.removeEventListener('click', this.onClick)
    this.canvas.removeEventListener('mouseleave', this.onLeave)
    this.canvas.removeEventListener('wheel', this.onWheel)
    this.unbindDrag?.()
    this.unbindDrag = null
    this.scheduler.remove(this.taskName)
    this.restore()
    this.removeTip()
  }

  task(): void {
    const msgs = this.scheduler.intake(this.taskName).drain() as Msg[]
    if (msgs.length === 0) return

    // 本 tick 最后一条消息生效（hover/click）；视口输入累加
    const msg = msgs[msgs.length - 1]
    if (msg.type === 'leave') {
      this.restore()
      return
    }

    let _dx = 0
    let _dy = 0
    let _view = false
    for (const m of msgs) {
      if (m.type === 'wheel') {
        this.camera.zoom(m.zoomDelta ?? 0, m.pos[0], m.pos[1])
        _view = true
      } else if (m.type === 'drag') {
        _dx += m.dx ?? 0
        _dy += m.dy ?? 0
        _view = true
      }
    }
    if (_view) {
      if (_dx !== 0 || _dy !== 0) this.camera.orbit(_dx, _dy)
      this.restore()             // 视口变化即清除锁定
      this.dirty.markFull()
      return
    }

    const hits = this.space.hitTest(this.model, this.camera, msg.pos[0], msg.pos[1])
    if (hits === null) return

    if (msg.type === 'move') this.hover(hits, msg.pos)
    else if (msg.type === 'click' && hits.length > 0) this.click(hits)
  }

  /** hover 集 — 对称差标脏、tooltip 跟随 */
  private hover($slots: number[], $pos: Vec2): void {
    const prev = this.model.hoverSlots
    const next = new Set<number>()
    for (const ξ of $slots) if (ξ >= 0 && ξ < this.model.count) next.add(ξ)
    for (const ξ of prev) if (!next.has(ξ)) this.dirty.mark(ξ)
    for (const ξ of next) if (!prev.has(ξ)) this.dirty.mark(ξ)
    this.model.hoverSlots = next

    if (next.size > 0) this.showTip($slots[0], $pos)
    else this.hideTip()
  }

  /** click 锁 — 旧锁直接到满生长、新锁重新生长 */
  private click($slots: number[]): void {
    const prev = this.model.clickSlots
    const next = new Set<number>()
    for (const ξ of $slots) if (ξ >= 0 && ξ < this.model.count) next.add(ξ)
    for (const ξ of prev) {
      if (next.has(ξ)) continue
      this.model.anim[ξ] = 1
      this.dirty.mark(ξ)
    }
    for (const ξ of next) {
      this.model.anim[ξ] = 0
      this.dirty.mark(ξ)
    }
    this.model.clickSlots = next
  }

  /** 丢弃两种锁（不做 anim 快照——生长自行完成） */
  private restore(): void {
    for (const ξ of this.model.hoverSlots) this.dirty.mark(ξ)
    for (const ξ of this.model.clickSlots) this.dirty.mark(ξ)
    this.model.hoverSlots.clear()
    this.model.clickSlots.clear()
    this.hideTip()
  }

  // —— tooltip ——

  private createTip(): void {
    if (this.tip) return
    const el = document.createElement('div')
    el.className = 'tsukiyo-tooltip'
    el.style.cssText = TOOLTIP.cssText
    this.tip = el
    const parent = this.canvas.parentElement
    if (!parent) return
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative'
    parent.appendChild(el)
  }

  private removeTip(): void {
    this.tip?.remove()
    this.tip = null
  }

  private showTip($ξ: number, $pos: Vec2): void {
    const el = this.tip
    if (!el) return
    const item = this.model.vToM($ξ)
    if (!item) return

    const xLabel = String(item[item.dimX] ?? item.dimX ?? '')
    const val = typeof item.value === 'number' ? item.value.toFixed(TOOLTIP.valueDecimals) : String(item.value)
    el.innerHTML =
      `<div style="font-weight:bold;margin-bottom:2px">${xLabel}</div>` +
      `<div>${item.dimY}: ${val}</div>`

    const [mx, my] = $pos
    const rect = el.getBoundingClientRect()
    const tw = rect.width || TOOLTIP.minW
    const th = rect.height || TOOLTIP.minH
    let _left = mx + TOOLTIP.offset
    let _top = my - th - TOOLTIP.offsetTop
    const parent = this.canvas.parentElement
    if (parent) {
      if (_left + tw > parent.clientWidth) _left = mx - tw - TOOLTIP.offset
      if (_top < 0) _top = my + TOOLTIP.offset
    }
    el.style.left = `${_left}px`
    el.style.top = `${_top}px`
    el.style.opacity = '1'
  }

  private hideTip(): void {
    if (this.tip) this.tip.style.opacity = '0'
  }
}
