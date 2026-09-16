/**
 * interact — 交互系统：hover 高亮 + click 聚焦
 *
 * 实现 Schedulable 契约 — 外部资源（DOM 事件）+ scheduler 注册
 *
 * 时序模型：
 *   浏览器事件（tick 外）→ intake('interact').feed(msg)
 *   scheduler tick（tick 内）→ this.task() → intake('interact').drain()
 *
 * 视线交互（滚轮推拉 + 拖拽绕转，全模式通用）:
 *   wheel → zoomBy(ΣΔ) — 消息累加同 tick 不丢步
 *   drag（M9Drag1nWindow 差分）→ orbitBy(Σdx, Σdy)
 *   差异全在相机双实现内（2D 缩放平移 / 3D dolly 自由旋转），interact 零分支
 *
 * 命中测试 — 委托 spatial 命中区（onHitTest 单出口）:
 *   3D 视线射线就绪走射线流（挤出体精测），否则走点流（图表平面精筛）— 流选择归 spatial
 *   interact 只拿命中槽位结果做 hover/click 状态管理，零几何感知
 *
 * 动画：interact 不自行插值，只设 anim[eid]=0 + hasAnim=true
 *   由 coord task 接管插值（单一动画入口）
 *
 * 幂等：bind/unbind 用 bound 标志守卫，事件处理器用箭头函数保持引用一致
 */
import type { Schedulable, Vec2 } from '../yomi'
import type { TsuModel } from '../m/model'
import type { Grid } from './spatial'
import type { Scheduler } from './scheduler'
import { TOOLTIP, ZOOM_STEP } from '../helper/const'
import { M9Drag1nWindow } from '@k1/utils'


// 交互消息类型 — 投递到 Intake 的载荷
interface InteractMsg {
  type: 'move' | 'click' | 'leave' | 'wheel' | 'drag'
  pos: Vec2
  /** 滚轮推拉增量（每像素 deltaY 折算，正=下滚推近） */
  zoomDelta?: number
  /** 拖拽绕转增量（CSS px 差分；2D 平移 / 3D 偏航+俯仰） */
  dx?: number
  dy?: number
}

export class Interact implements Schedulable {
  readonly taskName = 'interact'

  private canvas: HTMLCanvasElement
  private spatial: Grid
  private model: TsuModel
  private scheduler: Scheduler
  private bound = false

  // tooltip DOM 元素（hover 时显示元素数据）— interact 独有（与 SoA 无关的 DOM 态）
  private tooltipEl: HTMLDivElement | null = null

  // 箭头函数事件处理器 — 保持引用一致，removeEventListener 可精确匹配
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
  /** 滚轮推拉 — 上滚（deltaY<0）拉远看全景 / 下滚推近看细节；pos=光标位置（跟手缩放锚点）；passive:false 阻止页面滚动 */
  private readonly onWheel = ($e: WheelEvent): void => {
    $e.preventDefault()
    this.scheduler.intake(this.taskName).feed({
      type: 'wheel', pos: [$e.offsetX, $e.offsetY],
      zoomDelta: $e.deltaY * ZOOM_STEP,
    })
  }

  // M9Drag1nWindow 拖拽差分锚点 — callbackStart 重置 / callbackEnd 清零（累计 offset → 差分增量）
  private dragPrevX = 0
  private dragPrevY = 0
  /** M9Drag1nWindow 解绑函数 — bind 时保存，unbind 时调用 */
  private unbindDrag: (() => void) | null = null

  constructor($canvas: HTMLCanvasElement, $spatial: Grid, $model: TsuModel, $scheduler: Scheduler) {
    this.canvas = $canvas
    this.spatial = $spatial
    this.model = $model
    this.scheduler = $scheduler
  }

  /** 幂等激活 — 绑定 DOM 事件 + 注册 scheduler task */
  bind(): void {
    if (this.bound) return
    this.bound = true

    // 绑定 DOM 事件 — feed 到 scheduler 持有的 Intake
    this.canvas.addEventListener('mousemove', this.onMove)
    this.canvas.addEventListener('click', this.onClick)
    this.canvas.addEventListener('mouseleave', this.onLeave)
    // wheel 滚轮推拉 — 全模式通用（2D 视图缩放 / 3D 取景距离 dolly，差异在相机双实现）
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false })

    // 拖拽绕转 — M9Drag1nWindow（@k1/utils 通用工具）：canvas 按下 → document 跟踪 → 差分投递
    // 拖拽期间 document.mousemove 在 canvas.mousemove（目标阶段）之后冒泡到 → 同 tick 内 drag 消息
    // 排在最后 → task 取最后一条 = 拖拽优先于 hover，零仲裁代码
    this.unbindDrag = M9Drag1nWindow(
      this.canvas,
      ($el: HTMLElement, $offset: { _x: number; _y: number }) => {
        // 累计 offset 差分 → 每次回调只投递本次增量（增量语义与滚轮对齐）
        const dx = $offset._x - this.dragPrevX
        const dy = $offset._y - this.dragPrevY
        this.dragPrevX = $offset._x
        this.dragPrevY = $offset._y
        this.scheduler.intake(this.taskName).feed({ type: 'drag', pos: [0, 0], dx, dy })
      },
      () => { this.dragPrevX = 0; this.dragPrevY = 0 },   // callbackEnd — 差分锚点清零
      () => { this.dragPrevX = 0; this.dragPrevY = 0 },   // callbackStart — 锚点重置
    )

    // 注册常驻 task — after coord（coord 算完位置后才能精确命中）
    this.scheduler.add('interact', () => this.task(), { after: ['coord'] })

    // 创建 tooltip DOM 元素 — 挂载到 canvas 父容器
    this.createTooltip()
  }

  /** 幂等取消 — 解绑 DOM 事件 + 从 scheduler 移除 + 恢复高亮 */
  unbind(): void {
    if (!this.bound) return
    this.bound = false

    // 解绑 DOM 事件
    this.canvas.removeEventListener('mousemove', this.onMove)
    this.canvas.removeEventListener('click', this.onClick)
    this.canvas.removeEventListener('mouseleave', this.onLeave)
    this.canvas.removeEventListener('wheel', this.onWheel)

    // 解绑拖拽
    if (this.unbindDrag) {
      this.unbindDrag()
      this.unbindDrag = null
    }

    // 从 scheduler 移除 task + 清除 Intake（幂等）
    this.scheduler.remove(this.taskName)

    // 恢复高亮元素
    this.restoreHighlight()

    // 移除 tooltip DOM 元素
    this.removeTooltip()
  }

  /** tick 内调用 — drain Intake，处理最新事件 */
  task(): void {
    const intake = this.scheduler.intake(this.taskName)
    const msgs = intake.drain() as InteractMsg[]
    if (msgs.length === 0) return

    // 取最新一条（16ms 内多次事件合并为最后一次）
    const msg = msgs[msgs.length - 1]

    if (msg.type === 'leave') {
      this.restoreHighlight()
      return
    }

    // —— 视线交互（滚轮推拉 + 拖拽绕转）— 视线已变：先于命中流消费 ——
    // wheel 逐条按各自光标锚点顺序应用（同 tick 多次滚轮各自跟手）；
    // drag 逐条累加差分（平移/绕转增量语义）
    // 视线变换打断过期的 hover/click 锁定态 + markAllDirty 全景重投影
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
      this.restoreHighlight()     // 视线变换中 hover/click 锁定态已过期
      this.hideTooltip()          // tooltip 定位已过期
      this.model.markAllDirty()   // 全标脏 → layering 收全量脏区域 → 全景重投影
      return
    }

    // —— 命中检测 — 委托 spatial 命中区（碰撞检测单出口）——
    // null = 无法检测（3D 相机未就绪 / 2D 无法换算，保持现状态）；[] = 检测无命中（照常清 hover）
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

  /**
   * 设置高亮 — hover 态唯一写入点（纯 slots 更新，零 SoA 污染）。
   * 高亮视觉由 render/3D packer 绘制时从 hoverSlots 派生（描边+缩放），
   * fill[] 的唯一写入者仍是 point 阶段 — 数据更新与 hover 无交叠。
   */
  private setHover($slots: number[], $pos: Vec2): void {
    const m = this.model
    const prev = m.hoverSlots
    const next = new Set<number>()

    for (const slot of $slots) {
      if (slot >= 0 && slot < m.count) next.add(slot)
    }

    // 变化槽位标脏（旧集去新集 + 新集去旧集的对称差）
    if (prev.size !== next.size || ![...prev].every($s => next.has($s))) {
      for (const slot of prev) if (!next.has(slot)) m.markDirty(slot)
      for (const slot of next) if (!prev.has(slot)) m.markDirty(slot)
    }

    m.hoverSlots = next

    if (next.size > 0) {
      // tooltip 显示第一个命中元素的数据（鼠标位置经参数传入 — 零跨方法状态透传）
      this.showTooltip($slots[0], $pos)
    } else {
      this.hideTooltip()
    }
  }

  /** click 锁定 — 触发从 0 生长动画。自动取消前一个 click 的动画（幂等） */
  private setClick($slots: number[]): void {
    const m = this.model
    // 取消不再锁定的旧 click 动画 — snap anim 到 1，立即结束
    for (const slot of m.clickSlots) {
      if (!$slots.includes(slot)) {
        m.anim[slot] = 1
        m.markDirty(slot)
      }
    }

    // 设置新 click 锁定 — 重置 anim 从 0 生长
    const newSet = new Set($slots)
    for (const slot of $slots) {
      m.anim[slot] = 0
      m.markDirty(slot)
    }
    m.clickSlots = newSet
  }

  /** 清除 hover + click 状态（leave/unbind 时）— 纯 slots 清空 + 标脏 */
  private restoreHighlight(): void {
    const m = this.model
    for (const slot of m.hoverSlots) m.markDirty(slot)
    m.hoverSlots.clear()
    // 清除 click 锁定 — 不 snap anim，让 click 生长动画由 render 自然推进完成
    m.clickSlots.clear()

    this.hideTooltip()
  }


  // —— tooltip 辅助方法 ——

  /** 创建 tooltip DOM 元素，挂载到 canvas 父容器（样式单点配置于 TOOLTIP） */
  private createTooltip(): void {
    if (this.tooltipEl) return
    const el = document.createElement('div')
    el.className = 'tsukiyo-tooltip'
    el.style.cssText = TOOLTIP.cssText
    this.tooltipEl = el
    const parent = this.canvas.parentElement
    if (parent) {
      // 确保父容器是定位上下文
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative'
      }
      parent.appendChild(el)
    }
  }

  /** 从 DOM 移除 tooltip 元素 */
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

    // 填充内容 — dimX 实际值（横轴标签）+ value 数值
    // el.dimX 是维度字段名（如 'name'），el[el.dimX] 才是实际值（如 'A'）
    const xLabel = String(el[el.dimX] ?? el.dimX ?? '')
    const yLabel = el.dimY ?? ''
    const val = typeof el.value === 'number' ? el.value.toFixed(TOOLTIP.valueDecimals) : String(el.value)
    this.tooltipEl.innerHTML =
      `<div style="font-weight:bold;margin-bottom:2px">${xLabel}</div>` +
      `<div>${yLabel}: ${val}</div>`

    // 定位 — 鼠标位置右上方，避免遮挡（$pos 回调参数 — 零成员透传）
    const [mx, my] = $pos
    const rect = this.tooltipEl.getBoundingClientRect()
    const tw = rect.width || TOOLTIP.minW
    const th = rect.height || TOOLTIP.minH
    let _left = mx + TOOLTIP.offset
    let _top = my - th - TOOLTIP.offsetTop
    // 边界修正
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

  /** 隐藏 tooltip */
  private hideTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.style.opacity = '0'
    }
  }
}
