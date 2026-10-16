/**
 * engine — 引擎：注册全部 task 到 Scheduler，装配数据流（纯调度装配层，零布局绘制逻辑）。
 * 数据流（dataDirty 单标志全链驱动）：input → scale(std) → point → coord → paths → layering+draw。
 * 投递语义：data()/resize() 只「暂存 + reset('input')」零 SoA 写入；下一 tick input 消费 pending
 * （std → loadEls 暂存 → dataDirty 置位），point→coord→paths→layering 同 tick
 * 按 after 链串行完成（paths 单点清 dataDirty）→ SoA 永不出现「新值+旧形」跨 tick 混合态，
 * grid 重绘读到的 coordCtx 必为本轮最新。
 * coord 阶段单点生产：engine 持不可变原始 coordRule，③ coord task 每帧 dataDirty 从原始规则
 * 重新解析（string preset 拷贝 / locator 对象复用 / 工厂调用，三分支皆幂等）+ 投影 + 挂 ctx，
 * 解析前无消费者（paths/layering/draw 全部 after coord）。
 * ① input 消费 pending ② point 定型（SoA 唯一写入者）③ coord 单点生产 locator（解析+投影）
 * ④ paths 写非位置几何（Line/Curve Δ 问询 seal 回调）⑤ interact 常驻（用上一帧 spatial 索引，一帧滞后设计）
 * ⑥ layering 常驻 ⑦ draw 常驻 flush。
 * pause(name)/resume(name) 幂等。
 */
import type { DimConf, Renderer, Schedulable, CoordCtx, CoordRule, CoordMapper, ITsukiyoLocator, LayoutFn, Bounds } from '../yomi'

import { TsuModel } from '../m/model'
import { CoordMapper2D } from '../v/camera3'
import { std } from '../m/std'
import { pointTask, PointFn } from '../v/shape'

import { resolveCoordLocator } from '../v/coord'
import { pathsTask, buildClosedPaths, defaultSeal } from '../v/paths'
import type { SealFn } from '../yomi'
import { Scheduler } from './scheduler'

import { Grid } from './spatial'
import { DEFAULT_CELL_SIZE } from '../helper/const'
import { Dirty } from './dirty'
import { Interact } from '../v/interact'
import { Layering } from '../v/layering'
import { Hcvs_retina } from '../helper/canvas'
import { createRenderer } from '../v/render'


export interface EngineOpts {
  canvas: HTMLCanvasElement
  renderer: Renderer
  camera: CoordMapper   // 与 renderer 工厂成对，Grid 聚合区消费
  pointFn: PointFn
  sealFn?: SealFn | null
  coord: CoordRule
  /** external scheduler injection — sub-layers share the MAIN clock
   *  (single rAF, single lockstep tick; omitted = own new Scheduler) */
  scheduler?: Scheduler
  /** task name prefix (sub-layer isolation: `layer0:` never collides) */
  taskPrefix?: string
  /** bind mouse Interact? default true; sub-layers pass false (zero DOM listeners) */
  interact?: boolean
}

/** 投递载荷 — 暂存，input 消费（单通道，最后投递胜出） */
interface Pending {
  raw: any[] | null
  dim: DimConf | null
  resized: boolean
}

export class Engine {
  readonly model = new TsuModel()
  /** shared (sub-layer) or own scheduler — single-clock contract */
  readonly scheduler: Scheduler
  readonly spatial: Grid       // 划分区 + 聚合区（camera 构造注入）
  readonly dirty = new Dirty()
  private renderer: Renderer
  private canvas: HTMLCanvasElement
  private pointFn: PointFn
  private sealFn: SealFn = defaultSeal

  /** 坐标系规则 — 原始输入（string preset / locator 对象 / 工厂），不可变；
   * 每帧 dataDirty 从原始规则重新解析（三分支皆幂等），解析产物挂 this.locator */
  private coordRule: CoordRule
  /** 解析产物 — coord task 单点写（resolveCoordLocator：解析 + 投影 + 挂 ctx） */
  private locator: ITsukiyoLocator | null = null
  /** one-shot guard — locator init.zoom applied at most once per engine */
  private zoomApplied = false
  private viewWidth = 0
  private viewHeight = 0

  private pending: Pending = { raw: null, dim: null, resized: false }   // 投递暂存

  // closed-path fill layer — closedPaths derived at the tail of the paths
  // stage (after pathsTask + hook); fillColor registered by the consumer
  // via setFill; draw stage paints both as the underlay (under strokes)
  private closedPaths: Path2D[] = []
  /** AABB union of all chained slots (fill area) — layering unions it into
   *  the dirty region so the clipped underlay is never cut open */
  private closedBounds: Bounds | null = null
  /** AABB union over the PREVIOUS pass's slot positions — derived from the
   *  spatial index (the SAME old-position store the v24 old-slot dirtying
   * reads) at the tail of the paths stage, before layering drains it.
   *  Layering unions it into the dirty region so a per-frame-resizing
   *  closed chain (storm curtain) never leaves a ghost fill slab. */
  private oldClosedBounds: Bounds | null = null
  private fillColor: number | null = null

  private interact: Interact | null = null
  private layering: Layering | null = null
  private paused = new Map<string, Schedulable>()   // 暂停集（resume 重 bind）

  /** task name prefix — all scheduler calls route through taskName() */
  private taskPrefix: string
  /** registered task names (detach removes them all) */
  private taskNames: string[] = []
  /** true = this engine owns the rAF (own Scheduler); shared sub-layers false */
  private ownsScheduler: boolean

  /** taskName — single point of prefix composition (after refs stay prefixed) */
  private taskName($n: string): string {
    return this.taskPrefix + $n
  }

  constructor($opts: EngineOpts) {
    this.canvas = $opts.canvas
    this.renderer = $opts.renderer
    this.pointFn = $opts.pointFn
    this.sealFn = $opts.sealFn ?? defaultSeal
    this.locator = null
    this.coordRule = $opts.coord
    this.spatial = new Grid(DEFAULT_CELL_SIZE, $opts.camera)

    this.taskPrefix = $opts.taskPrefix ?? ''
    this.ownsScheduler = !$opts.scheduler
    this.scheduler = $opts.scheduler ?? new Scheduler()

    // retina 初始化（CSS 尺寸供 coord）— UNLAID-OUT canvas (display:none):
    // Hcvs_retina falls back to the canvas element default (300x150) which
    // would poison the viewport; keep 0 instead so the layering zero-size
    // guard defers the layer build until the host layout lands
    if ($opts.canvas.offsetWidth > 0 || $opts.canvas.offsetHeight > 0) {
      const r = Hcvs_retina($opts.canvas)
      this.viewWidth = r.cssWidth
      this.viewHeight = r.cssHeight
    }

    // interact — sub-layers pass interact:false (zero DOM listeners)
    if ($opts.interact !== false) {
      this.interact = new Interact($opts.canvas, this.spatial, this.model, this.scheduler)
    }

    // layering — 依赖全 getter 注入（读取即最新）；子层工厂注入（断循环依赖：
    // layering 不 import Engine，子层由本工厂创建并共享本引擎的 scheduler —— 单时钟）
    const engine = this
    this.layering = new Layering(
      this.model, this.spatial, this.dirty, this.scheduler,
      $opts.canvas,
      {
        viewWidth: () => this.viewWidth,
        viewHeight: () => this.viewHeight,
        locator: () => this.locator,
        closedBounds: () => this.closedBounds,
        // previous-pass fill area (spatial old-position union) — layering
        // unions it into the dirty region (ghost-slab fix)
        oldClosedBounds: () => this.oldClosedBounds,
        // sub-engine factory — shared main scheduler + prefix isolation +
        // interact:false; returns a ready engine with data already posted
        createSubEngine: async ($canvas, $conf, $w, $h) => {
          const { renderer } = await createRenderer($canvas, '2d')
          const sub = new Engine({
            canvas: $canvas,
            renderer,
            // camera: SHARED only when the layer opts in (sharedCamera:true —
            // e.g. a background layer that must track the main view);
            // default = an ISOLATED camera of its own: main-layer zoom/pan
            // never re-transforms this layer. The sub-engine binds NO DOM
            // events either way (interact:false) — sharing is render-only
            camera: $conf.sharedCamera ? $opts.camera : new CoordMapper2D(),
            pointFn: $conf.point,
            sealFn: $conf.paths ?? null,
            coord: $conf.coord,
            scheduler: engine.scheduler,
            taskPrefix: $conf.z > 0 ? `layer${$conf.z}:` : `bg${$conf.z}:`,
            interact: false,
          })
          // the sub-engine hosts NO layers of its own (empty layoutRule —
          // never nests a default grid under a decoration canvas)
          sub.layers(() => ({ layers: [] }))
          sub.model.snapAnim = true    // static decoration, no grow channel
          sub.data($conf.input, $conf.dim ?? undefined)
          sub.resize($w, $h)
          return sub
        },
      },
      this.taskPrefix,
    )
    this.registerTasks()
  }

  private registerTasks(): void {
    const T = ($n: string) => this.taskName($n)
    // ① input — 消费 pending（std → loadEls 暂存 → 置位）
    this.scheduler.add(T('input'), () => {
      const p = this.pending
      if (p.raw === null && !p.resized) {
        this.scheduler.complete(T('input'))
        return
      }

      // resize — 尺寸已同步更新（DOM 事实），此处只置位（coord task 用新尺寸重解析重投影）
      if (p.resized) {
        p.resized = false
        this.model.dataDirty = true
        this.layering?.notifySubLayers()
      }

      // data — std 标准化 + 暂存元素（SoA 写入权归 point）+ 置位
      if (p.raw !== null) {
        const elements = std(p.raw, p.dim ?? undefined)
        this.model.raw = p.raw
        this.model.loadEls(elements)
        p.raw = null
        p.dim = null

        this.layering?.notifySubLayers()
        this.model.dataDirty = true
      }

      this.scheduler.complete(T('input'))
    })

    // ② point — 定型（after input）— SoA 图形数组唯一写入者（pointFn 依赖元素数据，必须随数据重定型）
    this.scheduler.add(T('point'), () => {
      if (this.model.dataDirty) {
        pointTask(this.model, this.pointFn)
      }
    }, { after: [T('input')] })

    // ③ coord — 单点生产（after point）：解析规则 → 投影 → 挂 ctx（解析前无消费者）；
    // 始终从不可变原始规则解析（string 拷贝 / locator 复用 / 工厂调用，三分支幂等）
    this.scheduler.add(T('coord'), () => {
      if (!this.model.dataDirty) return
      this.locator = resolveCoordLocator(
        this.coordRule, this.model, this.viewWidth, this.viewHeight,
      )
      // initial view zoom (locator init.zoom) — applied ONCE after the
      // first successful coord pass, via the SAME zoomBy path as the wheel
      // zoom (pixel-identical result; gaze compensation around the screen
      // center keeps the content centered). absent/1 = zero effect on any
      // other consumer
      const iz = this.locator?.init?.zoom
      if (iz != null && iz > 0 && iz !== 1 && !this.zoomApplied) {
        // wait for a live viewport — the first coord pass may run BEFORE the
        // first resize lands (vw=0); do NOT burn the one-shot then
        if (this.viewWidth > 0 && this.viewHeight > 0) {
          this.zoomApplied = true
          this.spatial.zoomBy(Math.log(iz), this.viewWidth / 2, this.viewHeight / 2)
        }
      }
    }, { after: [T('point')] })

    // ④ paths — 封闭（after coord）— 接收 locator.ctx 写非位置几何（受 dataDirty 守卫）；
    // Line/Curve 的跨图形 Δ 连接问询 seal 回调（连接语义唯一事实源）；闭合链派生收编本 task 尾部；
    // dataDirty 所有退出路径统一清除
    this.scheduler.add(T('paths'), () => {
      if (!this.locator || !this.locator.ctx) {
        this.model.dataDirty = false   // 提前退出也清除，避免无限重算
        return
      }
      if (this.model.dataDirty) {
        pathsTask(this.model, this.locator, this.sealFn)
      }
      this.model.dataDirty = false
      // closed-path fill layer — lagging sub-task inside the paths stage:
      // derived (never stored in the SoA) after pathsTask closure; chains
      // walk the SAME seal Δ links (single chain truth source), so the
      // fill lane can never disagree with the stroke lane
      this.closedPaths = buildClosedPaths(this.model, this.sealFn, this.locator.ctx)
      // fill bounds — union of every chained slot's AABB. The underlay is
      // clipped to the dirty region now, so the region must cover the whole
      // fill area or a moved curtain gets cut open at the region edge
      this.closedBounds = this.computeClosedBounds()
      // previous-pass slot positions (spatial still holds them — layering
      // drains it LATER in the same frame): the old fill area, unioned
      // into the dirty region by layering below
      this.oldClosedBounds = this.computeSpatialBounds()
    }, { after: [T('coord')] })

    // ⑤ interact — 常驻（after coord；用上一帧 spatial 索引，一帧滞后设计）
    if (this.interact) this.interact.bind()

    // ⑥ layering — 常驻（after paths）
    if (this.layering) this.layering.bind()

    // ⑦ draw — 常驻 flush（after layering）— render 纯读取绘制
    this.scheduler.add(T('draw'), () => {
      const layering = this.layering
      if (!layering) return
      const big = layering.regionBigDrawing
      const box = layering.regionDrawing
      if (big.length === 0 || !box) return
      // 矩阵与视线同一次取景产出（三方同源）；underlay = closed-path fill layer
      this.renderer.flush(
        this.model, box, big, this.spatial.cameraMatrix, this.spatial.cameraSight,
        this.fillColor === null ? null : { paths: this.closedPaths, color: this.fillColor },
      )
    }, { after: [T('layering')], phase: 'draw' })

    this.taskNames = ['input', 'point', 'coord', 'paths', 'layering', 'draw'].map($n => T($n))
  }

  // —— 公共 API ——

  /** closed-path chains (read-only view) — derived at the tail of the paths stage */
  get closedPathsView (): readonly Path2D[] {
    return this.closedPaths
  }

  /** fill-area AABB union (null when no chains) — layering consumes it */
  get closedBoundsView (): Bounds | null {
    return this.closedBounds
  }

  /** AABB union over every slot that participates in a closed chain —
   *  computed once per paths pass (model.dataDirty window) */
  private computeClosedBounds(): Bounds | null {
    const m = this.model
    if (this.closedPaths.length === 0 || m.count === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const buf: Bounds = [[0, 0], [0, 0]]
    for (let i = 0; i < m.count; i++) {
      const [mn, mx] = m.aabbInto(i, buf)
      if (mn[0] < minX) minX = mn[0]
      if (mn[1] < minY) minY = mn[1]
      if (mx[0] > maxX) maxX = mx[0]
      if (mx[1] > maxY) maxY = mx[1]
    }
    if (!Number.isFinite(minX)) return null
    return [[minX, minY], [maxX, maxY]]
  }

  /** AABB union over the PREVIOUS pass's slot positions — same member set
   *  and union logic as computeClosedBounds, but sourced from the spatial
   *  index (the engine's old-position store) instead of the current model;
   *  computed at the paths-stage tail, before layering drains spatial */
  private computeSpatialBounds(): Bounds | null {
    if (this.closedPaths.length === 0 || this.model.count === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < this.model.count; i++) {
      const old = this.spatial.aabbOf(i)   // null = born this pass — skip
      if (!old) continue
      const [mn, mx] = old
      if (mn[0] < minX) minX = mn[0]
      if (mn[1] < minY) minY = mn[1]
      if (mx[0] > maxX) maxX = mx[0]
      if (mx[1] > maxY) maxY = mx[1]
    }
    if (!Number.isFinite(minX)) return null
    return [[minX, minY], [maxX, maxY]]
  }

  /** register the closed-path fill color (paths-stage closed chains are filled
   *  with it under the strokes every frame); null = disable the underlay */
  setFill ($color: number | null): void {
    this.fillColor = $color
  }

  /** register the layering layout callback — each layer = a full sub-engine
   *  on its own canvas (z<0 below / z>0 above the main canvas, sorted by z);
   *  null (or never called) = the default grid background layer */
  layers ($fn: LayoutFn | null): void {
    this.layering?.layers($fn)
  }

  /** 注入数据 — 暂存 pending，下一 tick 消费（SoA 写入全在 tick 内） */
  data($raw: any[], $dim?: DimConf): this {
    this.pending.raw = $raw
    this.pending.dim = $dim ?? null
    this.scheduler.reset(this.taskName('input'))
    return this
  }

  /** 尺寸 — 物理同步设（DOM 事实），数据流走 pending（下一 tick 生效） */
  resize($w: number, $h: number): this {
    // canvas is a REPLACED element (intrinsic 300x150): a CSS inset stretch
    // does NOT size it — the explicit inline width/height below IS the
    // layout owner. Always write it (the value flows from the caller's
    // DOM-derived size, never a poisoned canvas self-read)
    this.canvas.style.width = `${$w}px`
    this.canvas.style.height = `${$h}px`
    // explicit cssSize — the style write above has NOT flushed into
    // offsetWidth yet (same synchronous frame), so the retina guard would
    // wrongly wipe it; the caller's DOM-derived size IS the CSS basis
    const r = Hcvs_retina(this.canvas, undefined, undefined, [$w, $h])
    this.viewWidth = r.cssWidth
    this.viewHeight = r.cssHeight
    this.pending.resized = true
    this.scheduler.reset(this.taskName('input'))
    return this
  }

  /** 幂等暂停 — 移除 task + 解绑 */
  pause($name: string): this {
    if (this.paused.has($name)) return this

    if ($name === 'interact' && this.interact) {
      this.interact.unbind()
      this.paused.set($name, this.interact)
    }
    if ($name === 'layering' && this.layering) {
      this.layering.unbind()
      this.paused.set($name, this.layering)
    }
    return this
  }

  /** 幂等恢复 — 重 bind */
  resume($name: string): this {
    const mod = this.paused.get($name)
    if (!mod) return this

    mod.bind()
    this.paused.delete($name)
    return this
  }

  /** 启动引擎 — 仅自有 scheduler 才启 rAF（共享子层由主层驱动） */
  start(): this {
    if (this.ownsScheduler) this.scheduler.start()
    return this
  }

  /** detach — 从共享 scheduler 卸载本引擎全部 task（子层暂停/销毁唯一正道；
   *  不停 rAF —— 时钟归主层所有） */
  detach(): void {
    for (const $n of this.taskNames) this.scheduler.remove($n)
  }

  /** 停止引擎 — 自有 scheduler 停 rAF；同时销毁 layering 子分层（释放各层 canvas 与 task） */
  stop(): this {
    this.layering?.destroy()
    if (this.ownsScheduler) this.scheduler.stop()
    return this
  }
}