/**
 * layering — 视觉布局执行流（Schedulable，after paths）。
 * 静态层：默认 grid 网格背景层（raw canvas，非子引擎）挂主 canvas 下 z:-1 —
 *   绘制逻辑在 v/grid.ts；重绘时机统一本阶段：数据/尺寸变化（notifySubLayers）
 *   与视线变化（task ① 取景 moved 后）两处既有分支，与主层共享同一 cameraMatrix。
 * 动态层五阶段：① 取景+基准重建 ② 脏元素处理（drainDirty + AABB 扩张 + spatial 更新，被剔除重入队）
 * ③ 合并脏区域 ④ 大名单（域内相交 ∧ 视线内，含联动非脏）⑤ anim 推进。
 * 派生注入：视口/locator/coordCtx 全 getter 回调（读取即最新）。
 */
import type { Schedulable, ITsukiyoLocator, CoordCtx, Bounds, LayoutFn, LayerConf } from '../yomi'
import type { TsuModel } from '../m/model'
import type { Grid } from '../middleware/spatial'
import type { Dirty } from '../middleware/dirty'
import type { Scheduler } from '../middleware/scheduler'
import type { Engine } from '../middleware/engine'
import { Hm_unionBounds } from '../helper/maths'
import { Hcvs_retina } from '../helper/canvas'
import { drawGridLayer } from './grid'
import {
  DIRTY_PAD_RATIO, DIRTY_PAD_PX,
} from '../helper/const'

/** 派生依赖 — getter 注入（读取即最新） */
export interface LayeringDeps {
  viewWidth: () => number
  viewHeight: () => number
  locator: () => ITsukiyoLocator | null
  /** fill-area AABB (closed-chain union) — unioned into the dirty region so
   *  the clipped underlay is never cut open */
  closedBounds: () => Bounds | null
  /** previous-pass fill-area AABB — union of the PREVIOUS pass's slot
   *  positions, derived by the engine from the spatial index (the same
   *  old-position store the old-slot dirtying reads) at the paths-stage
   *  tail; layering unions it into the dirty region so a per-frame-
   *  resizing closed chain never leaves a ghost fill slab */
  oldClosedBounds: () => Bounds | null
  /** sub-engine factory — builds a layer engine SHARING this scheduler
   *  (single clock, prefixed tasks, interact off) with data posted */
  createSubEngine: (
    $canvas: HTMLCanvasElement, $conf: LayerConf, $w: number, $h: number,
  ) => Promise<Engine>
}

export class Layering implements Schedulable {
  /** task name — prefix + 'layering' (sub-layers: 'layer2:layering', no clash) */
  readonly taskName: string

  private model: TsuModel
  private spatial: Grid
  private dirty: Dirty
  private scheduler: Scheduler
  private canvas: HTMLCanvasElement
  private deps: LayeringDeps
  /** task name prefix (empty on the main layer) */
  private taskPrefix: string

  /** 本帧重绘域 — 脏 AABB 合并单一边界（render clearRect+clip） */
  regionDrawing: Bounds | null = null

  /** 重绘大名单 — 脏 ∪ 域内相交非脏（联动补绘） */
  regionBigDrawing: number[] = []

  private aabbBuf: Bounds = [[0, 0], [0, 0]]   // aabbInto 复用缓冲（零分配）
  private bound = false

  constructor(
    $model: TsuModel,
    $spatial: Grid,
    $dirty: Dirty,
    $scheduler: Scheduler,
    $canvas: HTMLCanvasElement,
    $deps: LayeringDeps,
    $taskPrefix = '',
  ) {
    this.model = $model
    this.spatial = $spatial
    this.dirty = $dirty
    this.scheduler = $scheduler
    this.canvas = $canvas
    this.deps = $deps
    this.taskPrefix = $taskPrefix
    this.taskName = $taskPrefix + 'layering'
  }

  // —— 分层管理（layers）——
  // 每个分层 = 独立子引擎（完整核心工作流），canvas 层按 z 数字排序：
  //   z<0 插主 canvas 前（背景层，如默认 grid 层 z:-1）；z>0 插主 canvas 后（装饰层）
  // 未传 layers 回调 → 默认 = 网格背景层（原内置 grid 绘制逻辑原样平移）

  private layoutFn: LayoutFn | null = null
  private layerEngines: Engine[] = []
  private layerCanvas: HTMLCanvasElement[] = []
  /** parallel flag per layerEngine — true = host-glued (size:'host') layer,
   *  skipped by the main resize cascade (CSS inset tracks the host alone) */
  private layerHostGlued: boolean[] = []
  private layersBuilt = false
  /** generation counter — async sub-engine creation guards against stale
   *  resolve after a rebuild/destroy (gen mismatch -> immediate detach) */
  private layerGen = 0
  private lastLayW = 0
  private lastLayH = 0
  /** default grid layer handle (raw canvas draw, not a sub-engine) */
  private gridEngine: { resize(w: number, h: number): void, destroy(): void } | null = null

  // 注册分层回调（engine 在 draw 装配后调用；不传 = 默认 grid 层）
  layers($fn: LayoutFn | null): void {
    this.layoutFn = $fn
    this.layersBuilt = false   // rebuild on next task()
  }

  // 通知重绘全部子分层（engine 在 locator 重解析 / resize 后调用）；
  // grid 层无条件重绘（消费最新 coordCtx/locator —— 数据泵后刻度必须刷新；
  // gazeM 此时为上一帧值，与本帧主层数据渲染同源同帧序，对齐一致）
  notifySubLayers(): void {
    if (!this.layersBuilt) return
    if (this.gridEngine) {
      this.gridEngine.resize(this.deps.viewWidth(), this.deps.viewHeight())
      return
    }
    this.resizeLayers()
  }

  // 主 canvas 定位基准 — 仅在 canvas 尚无显式定位时补 relative/zIndex
  // （Storm 等消费方的 canvas 已由 CSS 定为 absolute+inset:0 撑满 host，
  // 不能再被改成 relative，否则脱离 host 的尺寸约束）
  private ensureParentPosition(): void {
    if (this.canvas.classList.contains('tsukiyo-chart__layer')) return
    const own = getComputedStyle(this.canvas).position
    if (own !== 'static') return   // consumer CSS already positions it
    const parent = this.canvas.parentElement
    if (!parent) return
    const parentStyle = getComputedStyle(parent)
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative'
    }
    this.canvas.style.position = 'relative'
    this.canvas.style.zIndex = '1'
  }

  // 建层 — 按 z 升序创建 canvas + 子引擎（首帧 task() 惰性触发）；
  // 子引擎共享本 scheduler（单时钟同 tick），task 名前缀隔离，interact 关闭
  private buildLayers(): void {
    // zero-size guard — the canvas may not be laid out yet on the first
    // frame; skip WITHOUT setting layersBuilt (retry next frame once the
    // layout is ready, never lock a 0x0 dead layer)
    const w0 = this.deps.viewWidth()
    const h0 = this.deps.viewHeight()
    if (w0 <= 0 || h0 <= 0) return

    this.ensureParentPosition()
    this.destroyLayers()

    const parent = this.canvas.parentElement
    if (!parent) return

    const w = w0
    const h = h0

    // 未注册 layers 回调 → 默认 = grid 网格背景层（原内置行为，z:-1）
    if (!this.layoutFn) {
      const canvas = this.makeLayerCanvas(parent, { z: -1 }, w, h)
      const engine = {
        resize: ($w: number, $h: number) => {
          // explicit cssSize — the layer canvas may not be laid out yet in
          // this same synchronous frame (offsetWidth 0), the guard would
          // wrongly wipe the explicit layer size written at build time.
          // view = cameraMatrix: the grid rides the SAME freshly-framed
          // affine as the data layer (zoom/pan factors stay identical —
          // the grid canvas binds NO events of its own; gazeM defaults to
          // identity until the first frame())
          Hcvs_retina(canvas, undefined, this.spatial.cameraMatrix, [$w, $h])
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          // clear in IDENTITY space (wipeDevice) — a plain clearRect under
          // the affine above would clear a transformed sub-rect only, so
          // zoom/pan would leave stale grid strokes behind (ghost rings)
          this.wipeDevice(ctx)
          drawGridLayer(ctx, $w, $h, this.model, this.deps.locator())
        },
        destroy: () => { canvas.remove() },
      }
      engine.resize(w, h)
      // default grid layer rides a raw canvas draw (not a sub-engine —
      // it derives from the MAIN locator/coordCtx, no workflow of its own)
      this.gridEngine = engine
      this.layersBuilt = true
      this.lastLayW = w
      this.lastLayH = h
      return
    }

    // 注册了 layers 回调 → 逐层构建（z 升序，共享 scheduler 单时钟）
    const confs = this.layoutFn().layers.slice().sort((a, b) => a.z - b.z)
    const gen = this.layerGen
    confs.forEach(($conf, $i) => {
      const hostGlued = $conf.size === 'host'
      this.layerHostGlued.push(hostGlued)
      const canvas = this.makeLayerCanvas(parent, $conf, w, h)
      void this.deps.createSubEngine(canvas, $conf, w, h).then(($sub) => {
        if (gen !== this.layerGen) {
          // stale generation (rebuilt/destroyed meanwhile) — detach at once
          $sub.detach()
          $sub.stop()
          canvas.remove()
          return
        }
        this.layerEngines.push($sub)
        this.layerCanvas.push(canvas)
        if (hostGlued) {
          // host layer — size from the HOST element (the layer canvas is a
          // replaced element: inset:0 alone does not stretch it, the
          // sub-engine's resize writes the explicit inline size)
          const hw = parent.offsetWidth
          const hh = parent.offsetHeight
          if (hw > 0 && hh > 0) $sub.resize(hw, hh)
          return
        }
        // the sub-engine was built with the BUILD-TIME viewport (possibly
        // the 300x150 canvas default while the host was display:none);
        // re-sync it with the engine's CURRENT viewport so the layer can
        // never stay stuck at the stale build-time size
        const rw = this.deps.viewWidth()
        const rh = this.deps.viewHeight()
        $sub.resize(rw, rh)
      })
    })
    this.layersBuilt = true
    this.lastLayW = w
    this.lastLayH = h
  }

  // 层 canvas 工厂 — absolute 定位 + z 序 + 插入位置（z<0 主 canvas 前 / z>0 后）+ CSS 尺寸；
  // size:'host' 层挂到 HOST（主 canvas 父级）+ inset:0 CSS 撑满 —— 与主视口解耦
  private makeLayerCanvas(
    $parent: HTMLElement, $conf: { z: number, size?: 'host' }, w: number, h: number,
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const z = $conf.z
    canvas.classList.add('tsukiyo-chart__layer')
    canvas.style.position = 'absolute'
    canvas.style.zIndex = String(z)
    canvas.style.pointerEvents = 'none'
    if ($conf.size === 'host') {
      // host-glued layer — CSS inset stretch on the HOST element: the
      // layer tracks the host edges on its own, no JS size sync at all
      canvas.style.inset = '0'
    } else {
      // align to the MAIN canvas origin, NOT the parent's padding-box
      // origin: an absolutely-positioned `left:0/top:0` anchors at the
      // parent's PADDING edge, while the in-flow main canvas starts at
      // the CONTENT edge (parent padding away) — a plain 0,0 layer would
      // sit padding-off the data layer (grid misaligned with the marks
      // on every chart). The main canvas and the layer share the same
      // offsetParent (the parent is position:relative), so offsetLeft/
      // offsetTop ARE the padding delta; a consumer-placed absolute main
      // canvas (e.g. Storm inset) reports 0,0-safe values too
      canvas.style.left = `${this.canvas.offsetLeft}px`
      canvas.style.top = `${this.canvas.offsetTop}px`
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }
    if (z < 0) {
      $parent.insertBefore(canvas, this.canvas)
    } else {
      $parent.insertBefore(canvas, this.canvas.nextSibling)
    }
    return canvas
  }

  // 视口变化 → 各子分层 resize 重绘；
  // host 层不从主视口级联（尺寸解耦），但自身跟随 HOST 实时布局
  // （build 时刻的 host 尺寸可能还是 syncRect 前的全宽值）
  private resizeLayers(): void {
    const w = this.deps.viewWidth()
    const h = this.deps.viewHeight()
    if (w === this.lastLayW && h === this.lastLayH) return
    this.lastLayW = w
    this.lastLayH = h
    this.gridEngine?.resize(w, h)
    const host = this.canvas.parentElement
    for (let i = 0; i < this.layerEngines.length; i++) {
      if (this.layerHostGlued[i]) {
        // host layer — resize from the host's CURRENT layout (decoupled
        // from the main viewport; heals a stale build-time host size)
        const hw = host?.offsetWidth ?? 0
        const hh = host?.offsetHeight ?? 0
        if (hw > 0 && hh > 0) this.layerEngines[i].resize(hw, hh)
        continue
      }
      this.layerEngines[i].resize(w, h)
    }
  }

  // 销毁全部子分层 — 代数递增（悬挂守卫）+ 子 task 卸载 + canvas 移除 + 可重建
  private destroyLayers(): void {
    this.layerGen++
    if (this.gridEngine) {
      this.gridEngine.destroy()
      this.gridEngine = null
    }
    for (const $sub of this.layerEngines) {
      $sub.detach()   // remove prefixed tasks from the SHARED scheduler
      $sub.stop()     // release layer-owned resources
    }
    for (const $c of this.layerCanvas) $c.remove()
    this.layerEngines = []
    this.layerCanvas = []
    this.layerHostGlued = []
    this.layersBuilt = false
  }

  // 设备域全清 — setTransform 恒等后清整个物理画布
  private wipeDevice($ctx: CanvasRenderingContext2D): void {
    $ctx.save()
    $ctx.setTransform(1, 0, 0, 1, 0, 0)
    $ctx.clearRect(0, 0, $ctx.canvas.width, $ctx.canvas.height)
    $ctx.restore()
  }

  // —— Schedulable 契约 ——
  // 幂等激活（after paths — prefixed, sub-layers never replace the main task）
  bind(): void {
    if (this.bound) return
    this.bound = true
    this.scheduler.add(this.taskName, () => this.task(), { after: [this.taskPrefix + 'paths'] })
    // resume — rebuild sub-layers next task() (idempotent, gen-guarded)
    this.layersBuilt = false
  }

  // 幂等取消 — 级联暂停全部子分层（detach = 子层 task 从共享 scheduler 卸载，
  // 装饰层随主层同停，tick 零空转）
  unbind(): void {
    if (!this.bound) return
    this.bound = false
    this.scheduler.remove(this.taskName)
    for (const $sub of this.layerEngines) $sub.detach()
    this.layerEngines = []
    for (const $c of this.layerCanvas) $c.remove()
    this.layerCanvas = []
    if (this.gridEngine) {
      this.gridEngine.destroy()
      this.gridEngine = null
    }
  }

  // 五阶段流水线（见文件头）— drainDirty 唯一消费者 + region 唯一生产者
  task(): void {
    const w = this.deps.viewWidth()
    const h = this.deps.viewHeight()
    const m = this.model

    this.regionBigDrawing.length = 0
    this.regionDrawing = null

    // 惰性建层 — layers 回调注册后首帧构建（默认 grid 层同样路径）
    if (!this.layersBuilt) this.buildLayers()

    // ① 取景（moved = 视线变了 → 基准重建）
    const moved = this.spatial.frame(m, w, h)
    if (moved) this.resizeLayers()

    // grid repaint — right AFTER framing so it consumes the SAME freshly
    // computed cameraMatrix as the data layer: main-layer wheel/drag
    // re-renders the grid with IDENTICAL zoom/pan factors (the grid canvas
    // binds NO events of its own — the shared affine is the only coupling)
    if (this.gridEngine && moved) this.gridEngine.resize(w, h)

    // 基准重建 + dataCanvas 设备域全清（旧帧全废）
    if (moved) {
      Hcvs_retina(this.canvas, undefined, this.spatial.cameraMatrix)
      const dataCtx = this.canvas.getContext('2d')
      if (dataCtx) this.wipeDevice(dataCtx)
    }

    // ② 脏元素处理
    const aabb = this.aabbBuf
    for (const i of m.drainDirty()) {
      // OLD-position AABB (pre-move, from the insert-time snapshot) — union
      // into the dirty region so a moved element's PREVIOUS pixels are
      // cleared too (ghost-pixel fix; first appearance = null = skip)
      const old = this.spatial.aabbOf(i)
      if (old) this.dirty.mark(old)

      m.aabbInto(i, aabb)
      const [min, max] = aabb

      // 视线外剔除 — 重新入队
      if (w > 0 && h > 0 && this.spatial.outOfSight(aabb, w, h)) {
        m.markDirty(i)
        continue
      }

      // padding — ratio 覆盖 hover 残影，px 覆盖描边
      const cx = (min[0] + max[0]) / 2
      const cy = (min[1] + max[1]) / 2
      const halfW = (max[0] - min[0]) / 2 * DIRTY_PAD_RATIO + DIRTY_PAD_PX
      const halfH = (max[1] - min[1]) / 2 * DIRTY_PAD_RATIO + DIRTY_PAD_PX
      this.dirty.mark([[cx - halfW, cy - halfH], [cx + halfW, cy + halfH]])

      this.spatial.update(i, aabb)   // key = SoA 槽位（src 会被多原语覆盖）
    }

    // ③ 合并脏区域
    const regions = this.dirty.consume()
    if (regions.length === 0) return
    // fill-area union — the clipped underlay must be fully inside the
    // region, otherwise a large closed chain (e.g. storm curtain) gets cut
    // open at the region edge on every partial redraw.
    // TWO unions: the CURRENT box (never cut open) plus the PREVIOUS-pass
    // box (spatial old-position union, computed by the engine at the
    // paths-stage tail) — a chain whose SHAPE changes per frame (the
    // curtain's bottom edge rides moving drops) paints fill pixels that
    // the current box does not cover; without the old box those stale
    // fill pixels survive as a ghost slab
    const fillBox = this.deps.closedBounds()
    if (fillBox) regions.push(fillBox)
    const oldFillBox = this.deps.oldClosedBounds()
    if (oldFillBox) regions.push(oldFillBox)
    this.regionDrawing = Hm_unionBounds(regions)
    if (!this.regionDrawing) return

    // ④ 大名单 — 域相交 ∧ 视线内（含联动非脏）
    const [rMin, rMax] = this.regionDrawing
    for (let _i = 0; _i < m.count; _i++) {
      m.aabbInto(_i, aabb)
      const [min, max] = aabb

      if (w > 0 && h > 0 && this.spatial.outOfSight(aabb, w, h)) continue
      if (max[0] < rMin[0] || min[0] > rMax[0] || max[1] < rMin[1] || min[1] > rMax[1]) continue

      this.regionBigDrawing.push(_i)
    }

    // ⑤ anim 推进（anim<1 标脏 → 下一帧继续）
    m.stepAnim(this.regionBigDrawing)
  }

  destroy(): void {
    this.destroyLayers()
  }
}
