/**
 * v/evolve — 演进暂存：tick 管线之外的纯 DOM 残影域；中间形变态从不进调度器——冻结画布使快照全会话有效
 * mouseup 只暂存不写入（staged raw 是未触碰 model.raw 的纯推导）；唯一出口 confirm() 交引擎重生 SoA、discard() 丢弃即画布未变
 * 复用零平行机制：命中 → TsuSpace.hitTest、行定位 → vToM + __ri、值反演 ①②③ → grow 回放 / 极坐标积 / coord 差分
 */
import type { Element, Vec2, CoordCtx, CoordMapper, TsuStatus, ITsukiyoLocator } from '../yomi'
import type { TsuModel } from '../m/model'
import type { TsuSpace } from '../middleware/spatial'
import { specOf, rebuildBox } from './shape'
import { EVOLVE, TAU, ARC_START_ANGLE } from '../helper/const'
import { M9Drag1nWindow } from '@k1/utils'

/** 一次已提交的 raw 快照 — 回滚历史项（+ 缩略图） */
export interface EvoVersion {
  label: string
  raw: any[]
  /** 该版本定型时的画布缩略图（hover 预览用） */
  snap: HTMLCanvasElement | null
}

/** 引擎钩子 — 调度器唯一触点藏在 commit() 之后 */
export interface EvolveHost {
  /** 重投暂存 raw — 唤醒时钟、重生 SoA */
  commit($raw: any[]): void
  /** 最近 scale 上下文 — 驱动值反演（数据前为 null） */
  scaleCtx(): CoordCtx | null
  /** 已解析的 coord locator（纯投影重放、零 SoA 写入）——
   *  值通道由该投影自身的差分推导反演 */
  locator(): ITsukiyoLocator | null
  /** 状态订阅 — 待定快照等 'done' 推送 */
  onStatus($cb: ($s: TsuStatus) => void): () => void
}

interface ScreenBox {
  x: number
  y: number
  w: number
  h: number
}

/** 常驻残影 — 一个原始行在目标几何处的像素快照 */
interface Ghost {
  node: HTMLCanvasElement
  /** 当前屏幕盒（父系相对）——也是拉伸基准 */
  box: ScreenBox
  ri: number
  ξ: number
  el: Element
  unbind: () => void
}

/** 锁定的形状 — 内部抓取移动、边缘区拉伸 */
interface Lock {
  ri: number
  ξ: number
  el: Element
}

/** 活动手势 — 点击（未移动）切换锁定、拖拽则暂存 */
interface Gesture {
  kind: 'move' | 'stretch'
  ri: number
  ξ: number
  el: Element
  /** 手势开始时的残影屏幕原点（父系相对） */
  box: ScreenBox
  /** mousedown 屏幕位置（画布相对） */
  base: Vec2
  /** 是否移动超过点击阈值 */
  moved: boolean
  /** 拉伸方向 — 哪些边跟随光标（仅 stretch） */
  dir: { x: number; y: number }
}

/** 一条暂存编辑 — 以原始 raw 序号为键、手势可叠加 */
interface StagedEdit {
  dimY: string
  value?: number
}

/** 槽序 — 主锚点轴（笛卡尔）或角度（极坐标） */
interface SlotOrder {
  slots: number[]
  horizontal: boolean
  polar: boolean
}

/** raw 深拷贝 — structuredClone 带 JSON 兜底 */
function evoClone($raw: any[]): any[] {
  return typeof structuredClone === 'function'
    ? structuredClone($raw)
    : JSON.parse(JSON.stringify($raw))
}

/** 点在屏幕盒内 */
function inside($x: number, $y: number, $b: ScreenBox): boolean {
  return $x >= $b.x && $x <= $b.x + $b.w && $y >= $b.y && $y <= $b.y + $b.h
}

/** 点对盒的拉伸方向（0 = 不在该轴上） */
function stretchZone($x: number, $y: number, $b: ScreenBox): { x: number; y: number } {
  const e = EVOLVE.edgeZone
  const west = $x - $b.x < e
  const east = $b.x + $b.w - $x < e
  const north = $y - $b.y < e
  const south = $b.y + $b.h - $y < e
  return { x: east ? 1 : west ? -1 : 0, y: south ? 1 : north ? -1 : 0 }
}

/** 拉伸方向对应的光标 */
function stretchCursor($d: { x: number; y: number }): string {
  if ($d.x !== 0 && $d.y !== 0) return $d.x === $d.y ? 'nwse-resize' : 'nesw-resize'
  return $d.x !== 0 ? 'ew-resize' : 'ns-resize'
}

export class Evolution {
  /** 已提交 raw 快照 — v0 为原始 raw、回滚追加 */
  readonly versions: EvoVersion[] = []

  private canvas: HTMLCanvasElement
  private space: TsuSpace
  private model: TsuModel
  private camera: CoordMapper
  private host: EvolveHost

  private parent: HTMLElement | null = null
  /** 常驻 ghost — 每个触碰过的原始行一个、以 __ri 为键 */
  private ghosts = new Map<number, Ghost>()
  private selectBox: HTMLDivElement | null = null
  private indicator: HTMLDivElement | null = null

  private gesture: Gesture | null = null
  private lock: Lock | null = null
  private bound = false
  private insertAt = -1
  /** 插入中点（父系相对屏幕坐标）——ghost 落点 */
  private insMid: number | null = null
  private orderCache: SlotOrder | null = null

  /** 暂存分组序（null = raw 序未动） */
  private stagedOrder: string[] | null = null
  /** 逐行暂存编辑 — 暂存的唯一真源 */
  private stagedEdits = new Map<number, StagedEdit>()
  /** 被暂存重排挤出的原始行（其 ghost 不回收） */
  private dragRi: number | null = null
  /** 等提交后 'done' 推送再拍快照的版本 */
  private pendingSnap: EvoVersion | null = null
  private stagedCb: (() => void) | null = null
  private offStatus: (() => void) | null = null

  private unbindCanvas: (() => void) | null = null

  constructor(
    $canvas: HTMLCanvasElement, $space: TsuSpace, $model: TsuModel,
    $camera: CoordMapper, $host: EvolveHost,
  ) {
    this.canvas = $canvas
    this.space = $space
    this.model = $model
    this.camera = $camera
    this.host = $host
  }

  /** 3D 相机无 2D 仿射——不做 ghost 定位、无手势 */
  get supported(): boolean {
    return !this.camera.is3D
  }

  // —— 生命周期 ——————————————————————————————————————————

  bind(): void {
    if (this.bound || !this.supported) return
    const parent = this.canvas.parentElement
    if (!parent) return
    this.bound = true
    this.parent = parent
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative'
    this.createDom()

    // mousedown 须先于窗口追踪器（其 onmousedown 是属性赋值——此处 addEventListener 先触发）
    this.canvas.addEventListener('mousedown', this.onDown)
    this.canvas.addEventListener('mousemove', this.onHover)
    this.canvas.addEventListener('mouseleave', this.onLeave)
    this.unbindCanvas = M9Drag1nWindow(
      this.canvas,
      ($el: HTMLElement, $offset: { _x: number; _y: number }) => this.onDrag($offset),
      ($el: HTMLElement, $offset: { _x: number; _y: number }) => this.onDragEnd($offset),
    )

    // 历史根 — v0 标记原始 raw（按当前所见拍快照）
    if (this.versions.length === 0 && this.model.raw.length > 0) {
      this.versions.push({ label: 'v0 初始', raw: evoClone(this.model.raw), snap: this.snapshot() })
    }

    // 待定快照等引擎提交后的 'done' 推送
    this.offStatus = this.host.onStatus(($s: TsuStatus) => this.onHostStatus($s))
  }

  /** 退出 — 暂存随会话消亡（未确认 = 从未真实） */
  unbind(): void {
    if (!this.bound) return
    this.bound = false
    this.discard()
    this.offStatus?.()
    this.offStatus = null
    this.canvas.removeEventListener('mousedown', this.onDown)
    this.canvas.removeEventListener('mousemove', this.onHover)
    this.canvas.removeEventListener('mouseleave', this.onLeave)
    this.unbindCanvas?.()
    this.unbindCanvas = null
    this.clearGhosts()
    this.selectBox?.remove()
    this.indicator?.remove()
    this.selectBox = null
    this.indicator = null
    this.parent = null
    this.setCursor('')
  }

  /** 丢弃活动手势不暂存（锚点即将变化） */
  cancelGesture(): void {
    this.gesture = null
    this.insertAt = -1
    this.insMid = null
    this.orderCache = null
    this.hideIndicator()
    this.hideSelect()
    this.setCursor('')
  }

  /** 回滚到任一已提交版本 — 新 raw 代、历史全保留 */
  rollback($i: number): void {
    const v = this.versions[$i]
    if (!v) return
    this.discard()
    this.host.commit(evoClone(v.raw))
    const entry: EvoVersion = { label: `v${this.versions.length} 回滚→v${$i}`, raw: evoClone(v.raw), snap: null }
    this.versions.push(entry)
    this.pendingSnap = entry
  }

  // —— DOM（每次 bind 建一次——全部浮层挂在画布父系）——

  private createDom(): void {
    const p = this.parent
    if (!p) return
    this.selectBox = document.createElement('div')
    this.selectBox.style.cssText = EVOLVE.selectCssText
    this.indicator = document.createElement('div')
    this.indicator.style.cssText = EVOLVE.indicatorCssText
    p.appendChild(this.selectBox)
    p.appendChild(this.indicator)
  }

  // —— hover（选框 / 拉伸区）——————————————————

  private readonly onHover = ($e: MouseEvent): void => {
    if (this.gesture) return
    const [gx, gy] = this.pos($e)
    const lock = this.lock
    if (lock) {
      const b = this.ghosts.get(lock.ri)?.box
      if (b && inside(gx, gy, b)) {
        const dir = stretchZone(gx, gy, b)
        this.setCursor(dir.x !== 0 || dir.y !== 0 ? stretchCursor(dir) : 'move')
        this.hideSelect()
        return
      }
    }
    // 常驻 ghost 在冻结画布之上——先 hover 它们
    for (const gh of this.ghosts.values()) {
      if (inside(gx, gy, gh.box)) {
        this.setCursor('grab')
        this.hideSelect()
        return
      }
    }
    const hits = this.hit(gx, gy)
    const ξ = hits !== null && hits.length > 0 ? hits[0] : -1
    if (ξ >= 0) this.showSelect(ξ)
    else this.hideSelect()
    this.setCursor(ξ >= 0 ? 'grab' : 'default')
  }

  private readonly onLeave = (): void => {
    if (this.gesture) return
    this.hideSelect()
  }

  // —— 手势（点击锁定、拖拽暂存）———————————————————

  private readonly onDown = ($e: MouseEvent): void => {
    const [gx, gy] = this.pos($e)
    const lock = this.lock
    if (lock) {
      const b = this.ghosts.get(lock.ri)?.box
      if (b && inside(gx, gy, b)) {
        // 已锁 ghost——边缘区拉伸、内部抓取移动
        const dir = stretchZone(gx, gy, b)
        const kind = dir.x !== 0 || dir.y !== 0 ? 'stretch' : 'move'
        this.startGesture(kind, lock.ri, lock.ξ, lock.el, gx, gy, dir)
        return
      }
    }
    // 常驻 ghost 在冻结画布之上——先解析它们
    for (const gh of this.ghosts.values()) {
      if (inside(gx, gy, gh.box)) {
        this.startGesture('move', gh.ri, gh.ξ, gh.el, gx, gy)
        return
      }
    }
    const hits = this.hit(gx, gy)
    if (hits === null || hits.length === 0) {
      // 空点 — 解锁（已锁 ghost 仅在已暂存时存活）
      this.setLock(null)
      return
    }
    const ξ = hits[0]
    const el = this.model.vToM(ξ)
    if (!el || typeof el.__ri !== 'number') return
    this.startGesture('move', el.__ri, ξ, el, gx, gy)
  }

  private onDrag($offset: { _x: number; _y: number }): void {
    const g = this.gesture
    if (!g) return
    if (Math.abs($offset._x) > EVOLVE.clickEps || Math.abs($offset._y) > EVOLVE.clickEps) g.moved = true
    if (!g.moved) return
    if (g.kind === 'move') {
      const gh = this.ensureGhost(g)
      if (gh) {
        gh.node.style.left = `${g.box.x + $offset._x}px`
        gh.node.style.top = `${g.box.y + $offset._y}px`
      }
      this.updateInsertion([g.base[0] + $offset._x, g.base[1] + $offset._y])
    } else {
      // 拉伸 — 光标驱动动边、对边锚定
      const s = this.ghosts.get(g.ri)?.box
      if (!s) return
      const minS = EVOLVE.minSize
      const mx = g.base[0] + $offset._x
      const my = g.base[1] + $offset._y
      let _x0 = s.x
      let _y0 = s.y
      let _x1 = s.x + s.w
      let _y1 = s.y + s.h
      if (g.dir.x < 0) _x0 = Math.min(mx, _x1 - minS)
      if (g.dir.x > 0) _x1 = Math.max(mx, _x0 + minS)
      if (g.dir.y < 0) _y0 = Math.min(my, _y1 - minS)
      if (g.dir.y > 0) _y1 = Math.max(my, _y0 + minS)
      const gh = this.ghosts.get(g.ri)
      if (!gh) return
      gh.node.style.left = `${_x0}px`
      gh.node.style.top = `${_y0}px`
      gh.node.style.width = `${_x1 - _x0}px`
      gh.node.style.height = `${_y1 - _y0}px`
    }
  }

  private onDragEnd($offset: { _x: number; _y: number }): void {
    const g = this.gesture
    if (!g) return
    this.gesture = null
    this.setCursor('')
    this.hideIndicator()
    if (!g.moved) {
      // 点击 — 对解析出的形状切换锁定（ghost 原位）
      this.ensureGhost(g)
      this.setLock({ ri: g.ri, ξ: g.ξ, el: g.el })
      return
    }
    if (g.kind === 'move') this.stageMove(g, $offset)
    else this.stageStretch(g)
    this.insertAt = -1
    this.insMid = null
    this.orderCache = null
  }

  /** 手势设置 — move 解除锁定、stretch 保留锁定 */
  private startGesture(
    $kind: 'move' | 'stretch', $ri: number, $ξ: number, $el: Element,
    $sx: number, $sy: number, $dir?: { x: number; y: number },
  ): void {
    const gh = this.ghosts.get($ri)
    this.gesture = {
      kind: $kind, ri: $ri, ξ: $ξ, el: $el,
      box: gh ? { ...gh.box } : this.slotBox($ξ),
      base: [$sx, $sy], moved: false,
      dir: $dir ?? { x: 0, y: 0 },
    }
    if ($kind === 'move') this.setLock(null)
    this.hideSelect()
    this.setCursor($kind === 'stretch' ? stretchCursor(this.gesture.dir) : 'grabbing')
  }

  /** 锁定切换 — 已锁 ghost 蓝虚线；未暂存的闲置 ghost 纯装饰、解锁即消 */
  private setLock($l: Lock | null): void {
    const prev = this.lock
    this.lock = $l
    if (prev && prev.ri !== $l?.ri) {
      const gh = this.ghosts.get(prev.ri)
      if (gh) {
        gh.node.style.borderColor = ''
        if (!this.stagedEdits.has(prev.ri) && prev.ri !== this.dragRi && this.gesture?.ri !== prev.ri) {
          this.removeGhost(prev.ri)
        }
      }
    }
    if ($l) {
      const gh = this.ghosts.get($l.ri)
      if (gh) gh.node.style.borderColor = 'rgba(77, 163, 255, 0.95)'
    }
  }

  // —— ghost / 浮层 ————————————————————————————————————

  /** 世界盒 → 经冻结视口仿射的 css 屏幕盒 */
  private toScreen($b: ScreenBox): ScreenBox {
    const t = this.camera.view.m
    if (!t || t.length < 6) return { ...$b }
    const sx0 = t[0] * $b.x + t[2] * $b.y + t[4]
    const sy0 = t[1] * $b.x + t[3] * $b.y + t[5]
    const sx1 = t[0] * ($b.x + $b.w) + t[2] * ($b.y + $b.h) + t[4]
    const sy1 = t[1] * ($b.x + $b.w) + t[3] * ($b.y + $b.h) + t[5]
    return {
      x: Math.min(sx0, sx1), y: Math.min(sy0, sy1),
      w: Math.abs(sx1 - sx0), h: Math.abs(sy1 - sy0),
    }
  }

  /** 视口统一缩放（每世界像素的屏幕像素） */
  private viewScale(): number {
    const t = this.camera.view.m
    if (!t || t.length < 6) return 1
    return Math.hypot(t[0], t[1]) || 1
  }

  /** 事件位置 → 画布相对坐标（事件可能在 ghost 面上触发） */
  private pos($e: MouseEvent): Vec2 {
    const r = this.canvas.getBoundingClientRect()
    return [$e.clientX - r.left, $e.clientY - r.top]
  }

  /** 槽的当前屏幕盒（锚点 + 槽局部 bounds） */
  private slotBox($ξ: number): ScreenBox {
    const m = this.model
    const bounds = m.boundsOf($ξ)
    const bx0 = bounds ? Math.min(bounds[0][0], bounds[1][0]) : 0
    const by0 = bounds ? Math.min(bounds[0][1], bounds[1][1]) : 0
    const bw = bounds ? Math.abs(bounds[1][0] - bounds[0][0]) : 0
    const bh = bounds ? Math.abs(bounds[1][1] - bounds[0][1]) : 0
    return this.toScreen({ x: m.x[$ξ] + bx0, y: m.y[$ξ] + by0, w: bw, h: bh })
  }

  private showSelect($ξ: number): void {
    const s = this.slotBox($ξ)
    const c = this.canvas
    if (this.selectBox) {
      this.selectBox.style.left = `${c.offsetLeft + s.x}px`
      this.selectBox.style.top = `${c.offsetTop + s.y}px`
      this.selectBox.style.width = `${Math.max(s.w, 4)}px`
      this.selectBox.style.height = `${Math.max(s.h, 4)}px`
      this.selectBox.style.display = 'block'
    }
  }

  private hideSelect(): void {
    if (this.selectBox) this.selectBox.style.display = 'none'
  }

  private hideIndicator(): void {
    if (this.indicator) this.indicator.style.display = 'none'
  }

  /** 画布与全部活 ghost 面上的光标 */
  private setCursor($css: string): void {
    this.canvas.style.cursor = $css
    for (const gh of this.ghosts.values()) gh.node.style.cursor = $css
  }

  /** 手势行的 ghost — 建一次、像素快照原位 */
  private ensureGhost($g: Gesture): Ghost | null {
    const has = this.ghosts.get($g.ri)
    if (has) return has
    const c = this.canvas
    const ctx = c.getContext('2d')
    const p = this.parent
    if (!ctx || !p) return null
    const g = document.createElement('canvas')
    g.style.cssText = EVOLVE.ghostCssText
    g.style.pointerEvents = 'auto'
    const dpr = c.clientWidth > 0 ? c.width / c.clientWidth : 1
    const pad = EVOLVE.snapPad
    const dx = Math.max(0, Math.floor(($g.box.x - pad) * dpr))
    const dy = Math.max(0, Math.floor(($g.box.y - pad) * dpr))
    const dw = Math.min(c.width - dx, Math.ceil(($g.box.w + pad * 2) * dpr))
    const dh = Math.min(c.height - dy, Math.ceil(($g.box.h + pad * 2) * dpr))
    if (dw <= 0 || dh <= 0) return null
    g.width = dw
    g.height = dh
    g.style.width = `${dw / dpr}px`
    g.style.height = `${dh / dpr}px`
    g.getContext('2d')?.putImageData(ctx.getImageData(dx, dy, dw, dh), 0, 0)
    g.style.left = `${c.offsetLeft + dx / dpr}px`
    g.style.top = `${c.offsetTop + dy / dpr}px`
    g.style.display = 'block'
    // ghost 是活面——有自己的 hover/down + 窗口拖拽追踪器
    g.addEventListener('mousedown', this.onDown)
    g.addEventListener('mousemove', this.onHover)
    const unbind = M9Drag1nWindow(
      g,
      ($el: HTMLElement, $offset: { _x: number; _y: number }) => this.onDrag($offset),
      ($el: HTMLElement, $offset: { _x: number; _y: number }) => this.onDragEnd($offset),
    )
    p.appendChild(g)
    const gh: Ghost = {
      node: g, ri: $g.ri, ξ: $g.ξ, el: $g.el, unbind,
      box: { x: c.offsetLeft + dx / dpr, y: c.offsetTop + dy / dpr, w: dw / dpr, h: dh / dpr },
    }
    this.ghosts.set($g.ri, gh)
    return gh
  }

  private removeGhost($ri: number): void {
    const gh = this.ghosts.get($ri)
    if (!gh) return
    gh.unbind()
    gh.node.remove()
    this.ghosts.delete($ri)
  }

  private clearGhosts(): void {
    for (const ri of [...this.ghosts.keys()]) this.removeGhost(ri)
  }

  /** 整画布缩略图（版本条目用） */
  private snapshot(): HTMLCanvasElement | null {
    const c = this.canvas
    if (c.width === 0 || c.height === 0) return null
    const s = document.createElement('canvas')
    s.width = EVOLVE.snapWidth
    s.height = Math.max(1, Math.round(c.height * (EVOLVE.snapWidth / c.width)))
    s.getContext('2d')?.drawImage(c, 0, 0, s.width, s.height)
    return s
  }

  // —— 插入点（被拖组落点）—————————————————

  /** 槽序 — 主锚点轴（笛卡尔）或角度（极坐标） */
  private slotOrder(): SlotOrder {
    const m = this.model
    const t = this.camera.view.m
    const n = m.count

    // arc 族：每个锚点都在 hub 上——基于 hub 的圆度探测会看到半径 0、
    // 改用 aux 角带（paths 值切分的正向产物）作序
    let _arcs = 0
    let _rest = 0
    for (let _i = 0; _i < n; _i++) {
      const kind = specOf(m.id[_i])?.kind
      if (kind === 'arc') _arcs++
      else if (kind !== 'line' && kind !== 'curve' && kind !== 'text') _rest++
    }
    const idx: number[] = []
    for (let _i = 0; _i < n; _i++) idx.push(_i)
    if (_arcs >= 2 && _arcs > _rest) {
      idx.sort(($a, $b) => m.aux[$a * 5 + 1] - m.aux[$b * 5 + 1])
      return { slots: idx, horizontal: false, polar: true }
    }

    const pts: Vec2[] = []
    let _cx = 0
    let _cy = 0
    for (let _i = 0; _i < n; _i++) {
      const x = m.x[_i]
      const y = m.y[_i]
      const px = t && t.length >= 6 ? t[0] * x + t[2] * y + t[4] : x
      const py = t && t.length >= 6 ? t[1] * x + t[3] * y + t[5] : y
      pts.push([px, py])
      _cx += px
      _cy += py
    }
    _cx /= n || 1
    _cy /= n || 1

    // 圆度 — 极坐标族（饼 / 玫瑰 / 雷达）按角度排序
    let _mr = 0
    for (const p of pts) _mr += Math.hypot(p[0] - _cx, p[1] - _cy)
    _mr /= n || 1
    let _vr = 0
    if (_mr > 0) {
      for (const p of pts) _vr += (Math.hypot(p[0] - _cx, p[1] - _cy) - _mr) ** 2
    }
    const polar = _mr > 8 && Math.sqrt(_vr / (n || 1)) / _mr < 0.25

    let _minX = Infinity
    let _maxX = -Infinity
    let _minY = Infinity
    let _maxY = -Infinity
    for (const p of pts) {
      if (p[0] < _minX) _minX = p[0]
      if (p[0] > _maxX) _maxX = p[0]
      if (p[1] < _minY) _minY = p[1]
      if (p[1] > _maxY) _maxY = p[1]
    }
    const horizontal = (_maxX - _minX) >= (_maxY - _minY)

    if (polar) {
      idx.sort(($a, $b) =>
        polarKeyStatic(pts[$a], [_cx, _cy]) - polarKeyStatic(pts[$b], [_cx, _cy]))
    } else if (horizontal) {
      idx.sort(($a, $b) => pts[$a][0] - pts[$b][0])
    } else {
      idx.sort(($a, $b) => pts[$a][1] - pts[$b][1])
    }
    return { slots: idx, horizontal, polar }
  }

  /** 槽沿笛卡尔排序轴的序坐标 */
  private coordOf($ξ: number, $ord: SlotOrder): number {
    const m = this.model
    const t = this.camera.view.m
    const x = m.x[$ξ]
    const y = m.y[$ξ]
    return $ord.horizontal
      ? (t && t.length >= 6 ? t[0] * x + t[2] * y + t[4] : x)
      : (t && t.length >= 6 ? t[1] * x + t[3] * y + t[5] : y)
  }

  /** 重排分组键 — dimX 值（对象行）或 raw 值（基元） */
  private groupKey($el: Element): string {
    return this.prim ? String($el[$el.dimY]) : String($el[$el.dimX])
  }

  /** 极坐标 hub — 屏幕中心（Axis.cx/cy——arc 反正锚在那） */
  private hubScreen(): Vec2 {
    const ctx = this.host.scaleCtx()
    if (!ctx) return [this.canvas.clientWidth / 2, this.canvas.clientHeight / 2]
    const c = this.toScreen({ x: ctx.w / 2, y: ctx.h / 2, w: 0, h: 0 })
    return [c.x, c.y]
  }

  /** 角度归一到 [ARC_START_ANGLE, ARC_START_ANGLE + TAU) 基准 */
  private angNorm($θ: number): number {
    return ARC_START_ANGLE + (($θ - ARC_START_ANGLE) % TAU + TAU) % TAU
  }

  /** 分组序角 — arc：aux 角带中点（paths 切分产物）；
   *  其余极坐标族：锚点对 hub 的方位角 */
  private groupAngle($ξ: number, $hub: Vec2): number {
    const a = $ξ * 5
    const s = this.model.aux[a + 1]
    const e = this.model.aux[a + 2]
    if (Number.isFinite(s) && Number.isFinite(e) && e > s) return (s + e) / 2
    const p = this.toScreen({ x: this.model.x[$ξ], y: this.model.y[$ξ], w: 0, h: 0 })
    return Math.atan2(p.y - $hub[1], p.x - $hub[0])
  }

  private updateInsertion($cursor: Vec2): void {
    const g = this.gesture
    if (!g) return
    if (!this.orderCache) this.orderCache = this.slotOrder()
    const ord = this.orderCache
    if (ord.polar) {
      // 极坐标族绕 hub 重排——被拖 ghost 当前角对其余组角带角逐出插入槽；
      // 一条 hub 射线标记它
      const hub = this.hubScreen()
      const θ = Math.atan2($cursor[1] - hub[1], $cursor[0] - hub[0])
      const θn = this.angNorm(θ)

      const m = this.model
      const groups: { key: string; ang: number }[] = []
      const seen = new Set<string>()
      for (const ξ of ord.slots) {
        const el = m.vToM(ξ)
        if (!el) continue
        const key = this.groupKey(el)
        if (seen.has(key)) continue
        seen.add(key)
        groups.push({ key, ang: this.angNorm(this.groupAngle(ξ, hub)) })
      }
      const dragged = this.groupKey(g.el)
      const rest = groups.filter($g => $g.key !== dragged)

      let _at = 0
      for (const grp of rest) {
        if (grp.ang <= θn) _at++
      }
      this.insertAt = _at
      this.insMid = null

      const ind = this.indicator
      if (!ind) return
      const c = this.canvas
      const R = Math.hypot($cursor[0] - hub[0], $cursor[1] - hub[1]) + 14
      ind.style.left = `${c.offsetLeft + hub[0] - 1}px`
      ind.style.top = `${c.offsetTop + hub[1]}px`
      ind.style.width = '2px'
      ind.style.height = `${R}px`
      ind.style.transformOrigin = '1px 0'
      ind.style.transform = `rotate(${(θ * 180) / Math.PI - 90}deg)`
      ind.style.display = 'block'
      return
    }

    const m = this.model
    const groups: { key: string; coord: number }[] = []
    const seen = new Set<string>()
    for (const ξ of ord.slots) {
      const el = m.vToM(ξ)
      if (!el) continue
      const key = this.groupKey(el)
      if (seen.has(key)) continue
      seen.add(key)
      groups.push({ key, coord: this.coordOf(ξ, ord) })
    }
    const dragged = this.groupKey(g.el)
    const rest = groups.filter($g => $g.key !== dragged)

    let _at = 0
    for (const grp of rest) {
      if (grp.coord <= $cursor[ord.horizontal ? 0 : 1]) _at++
    }
    this.insertAt = _at

    // 指示条落在 rest[_at-1] 与 rest[_at] 的边界上
    const c = this.canvas
    const before = _at > 0 ? rest[_at - 1].coord : null
    const after = _at < rest.length ? rest[_at].coord : null
    let _mid: number
    if (before !== null && after !== null) _mid = (before + after) / 2
    else if (before !== null) _mid = before + 12
    else if (after !== null) _mid = after - 12
    else { this.insMid = null; this.hideIndicator(); return }
    // ghost 落在这个中点——保持父系相对
    this.insMid = ord.horizontal ? c.offsetLeft + _mid : c.offsetTop + _mid

    const ind = this.indicator
    if (!ind) return
    // 笛卡尔用普通条——清掉极坐标射线的 transform 残留
    ind.style.transform = ''
    if (ord.horizontal) {
      ind.style.left = `${c.offsetLeft + _mid - 1}px`
      ind.style.top = `${c.offsetTop}px`
      ind.style.width = '2px'
      ind.style.height = `${c.clientHeight}px`
    } else {
      ind.style.left = `${c.offsetLeft}px`
      ind.style.top = `${c.offsetTop + _mid - 1}px`
      ind.style.width = `${c.clientWidth}px`
      ind.style.height = '2px'
    }
    ind.style.display = 'block'
  }

  // —— 暂存（mouseup 即暂存——confirm() 是唯一写入）——————

  /** 基元数组 raw — 值即行（重排 = 值重插） */
  private get prim(): boolean {
    const raw = this.model.raw
    return raw.length > 0 && (typeof raw[0] !== 'object' || raw[0] === null)
  }

  /** 已暂存待 ✓ — 驱动 toolbar 确认条 */
  staged(): boolean {
    return this.stagedOrder !== null || this.stagedEdits.size > 0
  }

  /** 暂存变更订阅（推送——从不轮询） */
  onStaged($cb: (() => void) | null): void {
    this.stagedCb = $cb
  }

  private notifyStaged(): void {
    this.stagedCb?.()
  }

  /** 当前分组序 — 暂存序优先、raw 序其后 */
  private orderKeys(): string[] {
    if (this.stagedOrder) return this.stagedOrder
    const raw = this.model.raw
    if (raw.length === 0) return []
    const keys: string[] = []
    const seen = new Set<string>()
    if (this.prim) {
      for (const v of raw) {
        const k = String(v)
        if (!seen.has(k)) { seen.add(k); keys.push(k) }
      }
      return keys
    }
    const dimXKey = this.model.elements[0]?.dimX ?? 'index'
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue
      const k = String(row[dimXKey])
      if (!seen.has(k)) { seen.add(k); keys.push(k) }
    }
    return keys
  }

  /** 暂存 raw — 纯推导：先重排、再逐行编辑；model.raw 从不触碰；
   *  编辑以原始行（__ri）为键、随重排跟随——叠加手势保持一致 */
  private stagedRaw(): any[] | null {
    if (this.stagedOrder === null && this.stagedEdits.size === 0) return null
    const raw = this.model.raw
    if (raw.length === 0) return null

    if (this.prim) {
      let _next = raw.slice()
      const posOf = new Map<number, number>()
      raw.forEach(($v, $i) => posOf.set($i, $i))
      if (this.stagedOrder) {
        const buckets = new Map<string, number[]>()
        raw.forEach(($v, $i) => {
          const k = String($v)
          const b = buckets.get(k)
          if (b) b.push($i)
          else buckets.set(k, [$i])
        })
        const idx: number[] = []
        for (const k of this.stagedOrder) for (const i of buckets.get(k) ?? []) idx.push(i)
        if (idx.length !== raw.length) return null
        _next = idx.map(($i) => raw[$i])
        idx.forEach(($from, $to) => posOf.set($from, $to))
      }
      for (const [_ri, _e] of this.stagedEdits) {
        const pos = posOf.get(_ri)
        if (pos !== undefined && typeof _e.value === 'number') _next[pos] = _e.value
      }
      return _next
    }

    // 对象行 — 按 dimX 分组重排、再克隆每个被编辑的行
    let _next = raw.slice()
    if (this.stagedOrder) {
      const dimXKey = this.model.elements[0]?.dimX ?? 'index'
      const buckets = new Map<string, number[]>()
      raw.forEach(($row, $i) => {
        if (!$row || typeof $row !== 'object') return
        const k = String($row[dimXKey])
        const b = buckets.get(k)
        if (b) b.push($i)
        else buckets.set(k, [$i])
      })
      const idx: number[] = []
      for (const k of this.stagedOrder) for (const i of buckets.get(k) ?? []) idx.push(i)
      if (idx.length !== raw.length) return null
      _next = idx.map(($i) => raw[$i])
    }
    if (this.stagedEdits.size > 0) {
      const riOf = new Map<any, number>()
      raw.forEach(($row, $i) => { if ($row && typeof $row === 'object') riOf.set($row, $i) })
      _next = _next.map(($row) => {
        if (!$row || typeof $row !== 'object') return $row
        const e = this.stagedEdits.get(riOf.get($row) ?? -1)
        if (!e) return $row
        const out = { ...$row }
        if (typeof e.value === 'number') out[e.dimY] = e.value
        return out
      })
    }
    return _next
  }

  /** 一次完成的移动拖拽 — 暂存分组重排、落定 ghost */
  private stageMove($g: Gesture, $offset: { _x: number; _y: number }): void {
    const gh = this.ghosts.get($g.ri)
    if (!gh) return
    const ord = this.orderCache ?? this.slotOrder()
    const order = this.orderKeys()
    const dragged = this.groupKey($g.el)
    let _land: ScreenBox | null = null
    let _staged = false
    if (this.insertAt >= 0 && order.includes(dragged)) {
      const rest = order.filter($k => $k !== dragged)
      const at = Math.max(0, Math.min(this.insertAt, rest.length))
      const next = [...rest.slice(0, at), dragged, ...rest.slice(at)]
      if (!next.every(($k, $i) => $k === order[$i])) {
        // 已暂存；笛卡尔：ghost 落在插入中点、另一轴保持；极坐标：留在拖放处——
        // 只是暂存视觉、确认后的重生才拥有精确落位
        this.stagedOrder = next
        this.dragRi = $g.ri
        _staged = true
        if (!ord.polar) {
          const cur: ScreenBox = {
            x: gh.node.offsetLeft, y: gh.node.offsetTop,
            w: gh.node.offsetWidth, h: gh.node.offsetHeight,
          }
          _land = this.insMid !== null
            ? (ord.horizontal
              ? { x: this.insMid - cur.w / 2, y: cur.y, w: cur.w, h: cur.h }
              : { x: cur.x, y: this.insMid - cur.h / 2, w: cur.w, h: cur.h })
            : cur
        }
      }
    }
    if (_land) {
      gh.node.style.left = `${_land.x}px`
      gh.node.style.top = `${_land.y}px`
      gh.box = { ..._land }
    } else if (!ord.polar) {
      // 笛卡尔回弹——未暂存的落点归位
      gh.node.style.left = `${$g.box.x}px`
      gh.node.style.top = `${$g.box.y}px`
      gh.box = { ...$g.box }
    }
    if (_staged) this.notifyStaged()
  }

  /** 暂存一个原始行的值编辑（手势经 stagedEdits 叠加） */
  private stageEdit($ri: number, $dimY: string, $v: number): void {
    const edit = this.stagedEdits.get($ri) ?? { dimY: $dimY }
    edit.value = $v
    this.stagedEdits.set($ri, edit)
    this.notifyStaged()
  }

  /**
   * 一次完成的拉伸 — 经三条通道之一暂存（均由引擎侧正向映射推导——无平行反演公式）：
   *  ① 值维度 — 形状自身 grow 钩子以 value±ε 回放（写的键即值属维度：柱高 Grow.y——
   *    业务值——经观测盒差反演、与边无关：拉上边或下边都改高、柱宽不动）；
   *  ② 极坐标 — arc 族把 hub 处的拉伸分为径向 / 切向：径向走 grow 回放（玫瑰：r 即
   *    Grow.r 输出）、切向反演 paths 值切分（aux 角带 = value/vΣ·TAU——饼：值 = 角占比）；
   *  ③ 锚点 — coord 投影自身的差分（观测即锚点在拉伸下的位移——各动边差按锚点在
   *    槽盒内的占比加权：雷达辐条 / 散点 / 折线顶点——以及一切自定义投影）
   */
  private stageStretch($g: Gesture): void {
    const gh = this.ghosts.get($g.ri)
    if (!gh) return
    const s0 = gh.box
    const cur: ScreenBox = {
      x: gh.node.offsetLeft, y: gh.node.offsetTop,
      w: gh.node.offsetWidth, h: gh.node.offsetHeight,
    }
    gh.box = cur
    const k = this.viewScale()
    const dw = (cur.w - s0.w) / k
    const dh = (cur.h - s0.h) / k
    if (dw === 0 && dh === 0) return
    const spec = specOf(this.model.id[$g.ξ])
    if (!spec) return
    const el = this.model.vToM($g.ξ) ?? $g.el
    const ctx = this.host.scaleCtx()
    const v0 = this.stagedEdits.get($g.ri)?.value ?? el.value
    const eps = ctx ? (ctx.v1 - ctx.v0) / 1000 : 0

    // 值 → 盒维度——经形状自身 grow 钩子回放（唯一的值→尺寸声明）；写出的键携带斜率
    let _hs = 0
    let _ws = 0
    let _rs = 0
    if (spec.grow && ctx) {
      const box = rebuildBox(this.model, $g.ξ, spec, 1)
      const box2 = { ...box }
      spec.grow(v0 + eps, box2, ctx)
      const dH = box2.h - box.h
      const dW = box2.w - box.w
      const dR = (box2.r ?? NaN) - (box.r ?? NaN)
      _hs = Number.isFinite(dH) ? dH / eps : 0
      _ws = Number.isFinite(dW) ? dW / eps : 0
      _rs = Number.isFinite(dR) ? dR / eps : 0

      // ① 值维度 — 观测盒差经斜率反演（值属维度上的最小二乘）
      const den = _hs * _hs + _ws * _ws
      if (den > 1e-12) {
        let _v = v0 + (dh * _hs + dw * _ws) / den
        if (el.value >= 0) _v = Math.max(0, _v)
        if (Number.isFinite(_v) && _v !== v0) {
          this.stageEdit($g.ri, $g.el.dimY, _v)
          return
        }
      }
    }

    // ② 极坐标 — arc 族：hub 投影把拉伸分为径向 / 切向、各经正向产物反演
    const a = $g.ξ * 5
    const band = this.model.aux[a + 2] - this.model.aux[a + 1]
    if (ctx && spec.kind === 'arc' && Number.isFinite(this.model.aux[a + 1])) {
      const hub = this.hubScreen()
      const gx = cur.x + cur.w / 2 - hub[0]
      const gy = cur.y + cur.h / 2 - hub[1]
      const len = Math.hypot(gx, gy)
      const rOld = this.model.aux[a]
      if (len > 1 && rOld > 0) {
        const sx = cur.w - s0.w
        const sy = cur.h - s0.h
        const dr = (sx * gx + sy * gy) / len / k
        const ds = (sx * -gy + sy * gx) / len
        // 径向占优且 grow 回放有半径斜率：Δv = dr / r′（玫瑰半径即 Grow.r 输出）
        if (Math.abs(dr) > Math.abs(ds) && Math.abs(_rs) > 1e-12) {
          const v = v0 + dr / _rs
          if (Number.isFinite(v) && v >= 0) {
            this.stageEdit($g.ri, $g.el.dimY, v)
            return
          }
        }
        // 切向占优且 paths 值切分拥有角带（band = value/vΣ·TAU 按切分式校验）：
        // 值 = 角度占比——饼的其余部分不动
        const split = (this.model.value[$g.ξ] / ctx.vΣ) * TAU
        if (Math.abs(ds) > 1 && Math.abs(band - split) < 1e-6 && band > 0) {
          const rest = ctx.vΣ - this.model.value[$g.ξ]
          if (rest > 0) {
            const beta = Math.min(TAU * 0.9, Math.max(band + ds / (rOld * k), TAU * 0.01))
            const v = (beta * rest) / (TAU - beta)
            if (Number.isFinite(v) && v >= 0) {
              this.stageEdit($g.ri, $g.el.dimY, v)
              return
            }
          }
        }
      }
    }

    // ③ 锚点 — 投影自身的差分即反演；观测即锚点在拉伸下的位移
    //    （锚点在局部原点——其在槽盒内的占比为各动边差加权）
    const loc = this.host.locator()
    if (ctx && loc && eps !== 0) {
      const e1: Element = { ...el, value: v0 }
      const e2: Element = { ...el, value: v0 + eps }
      const iX = this.model.dimX[$g.ξ]
      const iY = this.model.dimY[$g.ξ]
      const ux = (loc.x(e2, loc.ctx, iX, iY) - loc.x(e1, loc.ctx, iX, iY)) / eps
      const uy = (loc.y(e2, loc.ctx, iX, iY) - loc.y(e1, loc.ctx, iX, iY)) / eps
      const m2 = ux * ux + uy * uy
      if (m2 > 1e-12) {
        const b = this.model.boundsOf($g.ξ)
        const bx0 = b ? Math.min(b[0][0], b[1][0]) : 0
        const bx1 = b ? Math.max(b[0][0], b[1][0]) : 0
        const by0 = b ? Math.min(b[0][1], b[1][1]) : 0
        const by1 = b ? Math.max(b[0][1], b[1][1]) : 0
        const fx = bx1 > bx0 ? Math.min(1, Math.max(0, -bx0 / (bx1 - bx0))) : 0.5
        const fy = by1 > by0 ? Math.min(1, Math.max(0, -by0 / (by1 - by0))) : 0.5
        // 只算动边（对边锚定）、屏幕坐标
        const δw = $g.dir.x < 0 ? cur.x - s0.x : 0
        const δe = $g.dir.x > 0 ? cur.x + cur.w - s0.x - s0.w : 0
        const δn = $g.dir.y < 0 ? cur.y - s0.y : 0
        const δs = $g.dir.y > 0 ? cur.y + cur.h - s0.y - s0.h : 0
        const ax = (fx * δe + (1 - fx) * δw) / k
        const ay = (fy * δs + (1 - fy) * δn) / k
        const dot = ax * ux + ay * uy
        if (Math.abs(dot) > 1e-9) {
          let _v = v0 + dot / m2
          if (el.value >= 0) _v = Math.max(0, _v)
          if (Number.isFinite(_v)) this.stageEdit($g.ri, $g.el.dimY, _v)
        }
      }
    }
  }

  /** ✓ — 唯一写入：暂存 raw 经数据通道 + 一个版本 */
  confirm(): void {
    const next = this.stagedRaw()
    if (!next) return
    const label = this.stagedOrder !== null && this.stagedEdits.size > 0
      ? '调序+调尺寸'
      : this.stagedOrder !== null ? '调序' : '调尺寸'
    this.clearStaged()
    this.host.commit(next)
    const entry: EvoVersion = { label: `v${this.versions.length} ${label}`, raw: evoClone(next), snap: null }
    this.versions.push(entry)
    this.pendingSnap = entry
  }

  /** ✗ — 丢弃暂存；画布从未变过 */
  discard(): void {
    this.cancelGesture()
    this.clearStaged()
  }

  private clearStaged(): void {
    this.stagedOrder = null
    this.stagedEdits.clear()
    this.dragRi = null
    this.setLock(null)
    this.clearGhosts()
    this.notifyStaged()
  }

  /** 提交后 'done' 推送 — 画布定型、拍待定快照 */
  private onHostStatus($s: TsuStatus): void {
    if ($s !== 'done' || !this.pendingSnap) return
    this.pendingSnap.snap = this.snapshot()
    this.pendingSnap = null
  }

  // —— 工具 —————————————————————————————————————————

  private hit($sx: number, $sy: number): number[] | null {
    return this.space.hitTest(this.model, this.camera, $sx, $sy)
  }
}

/** 模块级极坐标键（coordOf 共用——免每次调用建闭包） */
function polarKeyStatic($p: Vec2, $c: Vec2): number {
  return (Math.atan2($p[1] - $c[1], $p[0] - $c[0]) - ARC_START_ANGLE + TAU) % TAU
}
