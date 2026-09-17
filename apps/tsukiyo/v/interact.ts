/**
 * interact — 交互系统：hover 高亮 + click 聚焦（Schedulable）。
 * 时序：事件（tick 外）feed → Intake 暂存 → tick 内 drain。
 * 视线交互：wheel → zoomBy(ΣΔ)；drag 差分 → orbitBy(Σdx,Σdy)；2D/3D 差异全在相机双实现，interact 零分支。
 * 命中委托 spatial.onHitTest 单出口；动画委托 model 出口（setClickSlots anim=0 重生长）。
 */
import type { Schedulable, Vec2 } from '../yomi'
import type { TsuModel } from '../m/model'
import type { Grid } from '../middleware/spatial'
import type { Scheduler } from '../middleware/scheduler'
import { TOOLTIP, ZOOM_STEP } from '../helper/const'
import { M9Drag1nWindow } from '@k1/utils'


// 交互消息 — Intake 载荷
interface InteractMsg {
  type: 'move' | 'click' | 'leave' | 'wheel' | 'drag'
  pos: Vec2
  zoomDelta?: number   // 滚轮增量（正=推近）
  dx?: number          // 拖拽差分（2D 平移 / 3D 偏航+俯仰）
  dy?: number
}

export class Interact implements Schedulable {
  readonly taskName = 'interact'

  private canvas: HTMLCanvasElement
  private spatial: Grid
  private model: TsuModel
  private scheduler: Scheduler
  private bound = false

  // tooltip DOM（interact 独有 DOM 态）
  private tooltipEl: HTMLDivElement | null = null

  // 箭头函数处理器（引用一致，remove 可精确匹配）
  private readonly onMove = ($e: MouseEvent): void => {
    const pos: Vec2 = [$e.offsetX, $e.offsetY]
    this.scheduler.intake(this.taskName).feed({ type: 'move', pos })
  }
  private readonly onClick = ($e: MouseEvent): void => {
    const pos: Vec2 = [$e.offsetX, $e.offsetY]
    this.scheduler.intake(this.taskName).feed({ type: 'click', pos })
  }
  private readonly onLeave = (): void => {
    this.scheduler.intake(this.taskName).feed({ type: 'leave', pos: [0, 0] })
  }
  // 滚轮推拉 — pos=光标（跟手锚点）
  private readonly onWheel = ($e: WheelEvent): void => {
    $e.preventDefault()
    this.scheduler.intake(this.taskName).feed({
      type: 'wheel', pos: [$e.offsetX, $e.offsetY],
      zoomDelta: - $e.deltaY * ZOOM_STEP,
    })
  }

  // 拖拽差分锚点（累计 offset → 差分增量）
  private dragPrevX = 0
  private dragPrevY = 0
  private unbindDrag: (() => void) | null = null

  constructor($canvas: HTMLCanvasElement, $spatial: Grid, $model: TsuModel, $scheduler: Scheduler) {
    this.canvas = $canvas
    this.spatial = $spatial
    this.model = $model
    this.scheduler = $scheduler
  }

  /** 幂等激活 — 绑定 DOM 事件 + 注册 task */
  bind(): void {
    if (this.bound) return
    this.bound = true

    this.canvas.addEventListener('mousemove', this.onMove)
    this.canvas.addEventListener('click', this.onClick)
    this.canvas.addEventListener('mouseleave', this.onLeave)
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false })

    // 拖拽 — M9Drag1nWindow：canvas 按下 → document 跟踪 → 差分投递；
    // drag 消息同 tick 排最后 → 拖拽优先于 hover（零仲裁）
    this.unbindDrag = M9Drag1nWindow(
      this.canvas,
      ($el: HTMLElement, $offset: { _x: number; _y: number }) => {
        // 累计 offset 差分 → 本次增量
        const dx = $offset._x - this.dragPrevX
        const dy = $offset._y - this.dragPrevY
        this.dragPrevX = $offset._x
        this.dragPrevY = $offset._y
        this.scheduler.intake(this.taskName).feed({ type: 'drag', pos: [0, 0], dx, dy })
      },
      () => { this.dragPrevX = 0; this.dragPrevY = 0 },   // callbackEnd 清零
      () => { this.dragPrevX = 0; this.dragPrevY = 0 },   // callbackStart 重置
    )

    // 注册常驻 task（after coord — 位置算完才能命中）
    this.scheduler.add('interact', () => this.task(), { after: ['coord'] })

    this.createTooltip()
  }

  // 幂等取消 — 解绑 + 移除 + 恢复高亮
  unbind(): void {
    if (!this.bound) return
    this.bound = false

    this.canvas.removeEventListener('mousemove', this.onMove)
    this.canvas.removeEventListener('click', this.onClick)
    this.canvas.removeEventListener('mouseleave', this.onLeave)
    this.canvas.removeEventListener('wheel', this.onWheel)

    if (this.unbindDrag) {
      this.unbindDrag()
      this.unbindDrag = null
    }

    this.scheduler.remove(this.taskName)
    this.restoreHighlight()
    this.removeTooltip()
  }

  // tick 内 drain Intake
  task(): void {
    const intake = this.scheduler.intake(this.taskName)
    const msgs = intake.drain() as InteractMsg[]
    if (msgs.length === 0) return

    // 最新一条（16ms 内多次事件合并为最后一次）
    const msg = msgs[msgs.length - 1]

    if (msg.type === 'leave') {
      this.restoreHighlight()
      return
    }

    // 视线交互 — wheel 逐条按各自锚点（多次滚轮各自跟手）；drag 累加差分
    // 视线变换打断过期锁定态 + markAllDirty 全景重投影
    let _dx = 0
    let _dy = 0
    let _gazed = false
    for (const m of msgs as InteractMsg[]) {
      if (m.type === 'wheel') {
        this.spatial.zoomBy(m.zoomDelta ?? 0, m.pos[0], m.pos[1])
        _gazed = true
      } else if (m.type === 'drag') {
        _dx += m.dx ?? 0
        _dy += m.dy ?? 0
        _gazed = true
      }
    }
    if (_gazed) {
      if (_dx !== 0 || _dy !== 0) this.spatial.orbitBy(_dx, _dy)
      this.restoreHighlight()     // 锁定态过期
      this.hideTooltip()
      this.model.markAllDirty()   // 全标脏 → 全景重投影
      return
    }

    // 命中检测 — spatial 单出口（null=无法检测；[]=无命中）
    const hits = this.spatial.onHitTest(this.model, msg.pos[0], msg.pos[1])
    if (hits === null) return

    if (msg.type === 'move') {
      this.setHover(hits, msg.pos)
    } else if (msg.type === 'click') {
      if (hits.length > 0) {
        this.setClick(hits)
      }
    }
  }

  // hover — 委托 model 出口（视觉由 render 派生）
  private setHover($slots: number[], $pos: Vec2): void {
    const next = this.model.setHoverSlots($slots)

    if (next.size > 0) {
      this.showTooltip($slots[0], $pos)   // 第一个命中元素
    } else {
      this.hideTooltip()
    }
  }

  // click 锁定 — 委托 model 出口
  private setClick($slots: number[]): void {
    this.model.setClickSlots($slots)
  }

  // 清 hover + click（leave/unbind）
  private restoreHighlight(): void {
    this.model.clearHover()
    this.model.clearClick()   // 不 snap anim，生长自然完成
    this.hideTooltip()
  }

  // —— tooltip ——

  // tooltip DOM（样式单点于 TOOLTIP）
  private createTooltip(): void {
    if (this.tooltipEl) return
    const el = document.createElement('div')
    el.className = 'tsukiyo-tooltip'
    el.style.cssText = TOOLTIP.cssText
    this.tooltipEl = el
    const parent = this.canvas.parentElement
    if (parent) {
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative'   // 确保定位上下文
      }
      parent.appendChild(el)
    }
  }

  private removeTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.remove()
      this.tooltipEl = null
    }
  }

  private showTooltip($slot: number, $pos: Vec2): void {
    if (!this.tooltipEl) return
    const el = this.model.vToM($slot)
    if (!el) return

    // el.dimX 是字段名，el[el.dimX] 是实际值
    const xLabel = String(el[el.dimX] ?? el.dimX ?? '')
    const yLabel = el.dimY ?? ''
    const val = typeof el.value === 'number' ? el.value.toFixed(TOOLTIP.valueDecimals) : String(el.value)
    this.tooltipEl.innerHTML =
      `<div style="font-weight:bold;margin-bottom:2px">${xLabel}</div>` +
      `<div>${yLabel}: ${val}</div>`

    // 定位 — 鼠标右上方
    const [mx, my] = $pos
    const rect = this.tooltipEl.getBoundingClientRect()
    const tw = rect.width || TOOLTIP.minW
    const th = rect.height || TOOLTIP.minH
    let _left = mx + TOOLTIP.offset
    let _top = my - th - TOOLTIP.offsetTop
    const parent = this.canvas.parentElement
    if (parent) {
      const pw = parent.clientWidth
      if (_left + tw > pw) _left = mx - tw - TOOLTIP.offset
      if (_top < 0) _top = my + TOOLTIP.offset
    }
    this.tooltipEl.style.left = `${_left}px`
    this.tooltipEl.style.top = `${_top}px`
    this.tooltipEl.style.opacity = '1'
  }

  private hideTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.style.opacity = '0'
    }
  }
}
