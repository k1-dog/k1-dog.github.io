/**
 * engine — 阶段装配：七阶段注册到共享时钟 产物以实参交棒给下一阶段
 * input → scale → shape → coord → paths → layering → draw
 * engine 只持有子系统与投递通道——产物绝不落 engine 字段
 */
import type { DimConf, Renderer, CoordRule, CoordMapper, LayoutFn, RenderBatch, ITsukiyoLocator, FillRoad, Element, RoadFn, RoadRule, CoordCtx, TsuStatus } from '../yomi'
import { TsuModel } from '../m/model'
import { std } from '../m/std'
import { scale } from '../m/scale'
import { shape, ShapeFn, defaultShapeFn } from '../v/shape'
import { coord, resolveLocator } from '../v/coord'
import { paths, defaultRoad } from '../v/paths'
import { grow, reset } from '../v/anim'
import { TsuSpace } from './spatial'
import { TsuDirty } from './dirty'
import { Layering } from '../v/layering'
import { Interact } from '../v/interact'
import { Evolution } from '../v/evolve'
import type { EvoVersion } from '../v/evolve'
import { TsuToolbar } from '../v/toolbar'
import { createRenderer } from '../v/render'
import { Hcvs_retina } from '../helper/canvas'
import { Scheduler } from './scheduler'

export interface EngineOpts {
  canvas: HTMLCanvasElement
  renderer: Renderer
  camera: CoordMapper
  /** 时钟 — Tsukiyo 持有 全部子层共享 */
  scheduler: Scheduler
  shapeFn?: ShapeFn
  roadFn?: RoadFn | RoadRule | null
  coord: CoordRule
  snapAnim?: boolean
  /** 阶段名前缀（子层隔离） */
  taskPrefix?: string
  /** 绑定 DOM 交互？缺省 true；子层传 false */
  interact?: boolean
}

/** 投递通道 — 后到优先 本 tick 内消费 */
interface Inbox {
  raw: any[] | null
  dim: DimConf | null
  /** 新数据代到达——槽位数在 shape 阶段才可知 生长通道在那里复位 */
  fresh: boolean
}

/** 阶段名 — 单一表 每引擎加前缀（frame = 阶段⓪） */
const STAGES = ['frame', 'input', 'scale', 'shape', 'coord', 'paths', 'layering', 'draw'] as const

export class Engine {
  readonly model = new TsuModel()
  readonly scheduler: Scheduler
  readonly space = new TsuSpace()
  readonly dirty = new TsuDirty()
  readonly camera: CoordMapper

  private renderer: Renderer
  private canvas: HTMLCanvasElement
  private view = { w: 0, h: 0 }
  private inbox: Inbox = { raw: null, dim: null, fresh: false }
  private interact: Interact | null = null
  private layering: Layering | null = null
  /** 演化幽灵域 + 工具栏（仅主层） */
  private evolution: Evolution | null = null
  private toolbar: TsuToolbar | null = null
  private evolving = false
  private taskPrefix: string
  private snapAnim: boolean
  /** coord 规则快照 — 阶段回调闭包捕获 */
  private coordRule: CoordRule
  /** paths 规则（声明式 RoadRule 或回调）— paths 阶段统一解析 */
  private roadRule: RoadFn | RoadRule
  /** 每帧生产者钩子 — 由引擎时钟驱动 */
  private frameHook: (() => void) | null = null
  /** 数据代 — input 递增 scale 监视（布防） */
  private dataGen = 0
  private dataSeen = 0
  /** 视图代 — resize 递增 scale 监视（布防） */
  private viewGen = 0
  private viewSeen = 0
  /** 视口守卫 — 画布离屏时停摆共享时钟 */
  private io: IntersectionObserver | null = null
  /** 离屏标志 — 画布离开视口（状态 paused） */
  private offscreen = false
  /** 最近消费的 dim — 演化提交必须带它重投递 */
  private lastDim: DimConf | null = null
  /** 最近尺度上下文 — 演化值逆映射读取 */
  private lastCtx: CoordCtx | null = null
  /** 状态监听 — 变更即推送 绝不轮询 */
  private statusCbs = new Set<($s: TsuStatus) => void>()
  private lastStatus: TsuStatus | null = null

  /** coord 声明的数值 x 域字段（scale 读取） */
  private get coordDomX(): string | undefined {
    const r = this.coordRule
    return typeof r === 'object' && r !== null && 'dom' in r ? (r as any).dom?.x : undefined
  }

  /** 零基线开关（coord.init.y0，默认开启） */
  private get coordY0(): boolean {
    const r = this.coordRule
    if (typeof r === 'string') return r !== 'radar'
    if (r === null || typeof r !== 'object') return true
    return (r as ITsukiyoLocator).init?.y0 !== false
  }

  private name($n: string): string {
    return this.taskPrefix + $n
  }

  constructor($opts: EngineOpts) {
    this.canvas = $opts.canvas
    this.renderer = $opts.renderer
    this.camera = $opts.camera
    this.snapAnim = $opts.snapAnim === true
    this.taskPrefix = $opts.taskPrefix ?? ''
    this.scheduler = $opts.scheduler
    this.coordRule = $opts.coord
    this.roadRule = $opts.roadFn ?? undefined

    if ($opts.canvas.offsetWidth > 0 || $opts.canvas.offsetHeight > 0) {
      this.view.w = $opts.canvas.offsetWidth
      this.view.h = $opts.canvas.offsetHeight
    }

    if ($opts.interact !== false) {
      this.interact = new Interact(
        this.canvas, this.space, this.model, this.camera, this.dirty, this.scheduler, this.taskPrefix,
      )
      // 演化幽灵域 — 唯一时钟触点 = commit 回调（既有数据通道重投递）
      const self = this
      this.evolution = new Evolution(this.canvas, this.space, this.model, this.camera, {
        commit: ($raw: any[]): void => { self.data($raw, self.lastDim ?? undefined) },
        scaleCtx: (): CoordCtx | null => self.lastCtx,
        // 投影纯重放 — 零 SoA 写（hopPath 复跑模式）
        // 值通道逆映射由这份投影自身派生——自定义投影免费获得演化
        locator: (): ITsukiyoLocator | null => {
          const ctx = self.lastCtx
          if (!ctx) return null
          const loc = resolveLocator(self.coordRule, ctx.w, ctx.h, ctx.dY)
          loc.ctx = { ...ctx, domX: loc.dom?.x ?? ctx.domX }
          return loc
        },
        onStatus: ($cb: ($s: TsuStatus) => void): (() => void) => self.onStatus($cb),
      })
      this.toolbar = new TsuToolbar(this.canvas, {
        status: (): TsuStatus => self.status,
        statusDetail: () => self.statusDetail(),
        onStatus: ($cb: ($s: TsuStatus) => void): (() => void) => self.onStatus($cb),
        evolveSupported: (): boolean => self.evolution?.supported === true,
        evolving: (): boolean => self.evolving,
        toggleEvolve: (): void => self.setEvolve(!self.evolving),
        versions: (): EvoVersion[] => self.evolution?.versions ?? [],
        rollback: ($i: number): void => self.evolution?.rollback($i),
        staged: (): boolean => self.evolution?.staged() === true,
        confirmStaged: (): void => self.evolution?.confirm(),
        discardStaged: (): void => self.evolution?.discard(),
      })
      // 暂存变更推送 — 确认条刷新 绝不轮询
      this.evolution.onStaged(() => self.toolbar?.onStaged())
    }

    // 状态 — scheduler 状态跃迁时推送 绝不轮询
    this.scheduler.onState(() => this.pushStatus())

    const self = this
    this.layering = new Layering(
      this.model, this.space, this.dirty, this.scheduler, this.camera, this.canvas,
      {
        viewWidth: () => self.view.w,
        viewHeight: () => self.view.h,
        createSubEngine: async ($canvas, $conf, $w, $h) => {
          const { renderer, camera } = await createRenderer($canvas, '2d', $conf.sharedCamera ? self.camera : null)
          const sub = new Engine({
            canvas: $canvas,
            renderer,
            camera,
            scheduler: self.scheduler,
            shapeFn: $conf.shape,
            roadFn: $conf.paths ?? null,
            coord: $conf.coord ?? 'Bar',
            taskPrefix: $conf.z > 0 ? `layer${$conf.z}:` : `bg${$conf.z}:`,
            interact: false,
            snapAnim: true,
          })
          sub.layers(() => ({ layers: [] }))
          sub.data($conf.input ?? [], $conf.dim)
          sub.resize($w, $h)
          return sub
        },
      },
      this.taskPrefix,
    )

    this.registerStages($opts.shapeFn ?? defaultShapeFn, $opts.roadFn ?? defaultRoad, $opts.coord)

    // 视口守卫 — 仅主层（子层搭乘共享时钟与宿主视口）
    // 离屏 park 回视口 wake
    if ($opts.interact !== false && typeof IntersectionObserver !== 'undefined') {
      const self = this
      this.io = new IntersectionObserver(($es) => {
        for (const e of $es) {
          if (e.isIntersecting) {
            self.offscreen = false
            self.scheduler.wake()
          } else {
            self.offscreen = true
            self.scheduler.park()
          }
          self.pushStatus()
        }
      })
      this.io.observe(this.canvas)
    }
  }

  /** 七阶段 — 各消费自己声明的产物 产出自己的 */
  private registerStages($shapeFn: ShapeFn, $roadFn: RoadFn | RoadRule, $coordRule: CoordRule): void {
    const T = ($n: string) => this.name($n)
    const s = this.scheduler

    // ⓪ frame — 外部每帧生产者先于数据链运行
    s.add(T('frame'), (): true => {
      // 泄漏守卫 — 脱离 DOM 的画布永久停摆共享时钟
      if (!this.canvas.isConnected) {
        this.scheduler.stop()
        return true
      }
      this.frameHook?.()
      return true
    }, { always: true })

    // 保活 — 帧钩子存在即要求时钟
    s.addKeepAlive(T('frame'), () => this.frameHook !== null)

    // ① input — 消费信箱并归一化；新数据开启新生长代（复位 anim + 全量重绘）
    s.add(T('input'), (): Element[] | true | undefined => {
      const box = this.inbox
      if (box.raw === null) return undefined
      const els = std(box.raw, box.dim ?? undefined)
      this.model.raw = box.raw
      this.model.elements = els
      if (box.dim) this.lastDim = box.dim
      box.raw = null
      box.dim = null
      this.dataGen++
      return els
    }, { always: true })

    // ② scale — 维度划分 + 域统计；产物即尺度上下文（coord 只做纯投影）
    //    布防：新数据代或视图变更——否则不产出 下游保留上轮结果
    s.add(T('scale'), ($els: Element[] | undefined): CoordCtx | undefined => {
      if (this.dataGen === this.dataSeen && this.viewGen === this.viewSeen) return undefined
      this.dataSeen = this.dataGen
      this.viewSeen = this.viewGen
      const domX = this.coordDomX
      const y0 = this.coordY0
      const ctx = scale(this.model, $els ?? this.model.elements, this.view.w, this.view.h, domX, undefined, y0)
      // kept for the evolution inverse maps (grow replay / projection replay)
      this.lastCtx = ctx
      return ctx
    }, { always: true, after: [T('input')] })

    // ③ shape — 形状声明 → 图形槽（SoA 唯一写入者）
    //    新数据代在此复位生长通道（槽位数此刻才可知）并全量标脏
    s.add(T('shape'), ($c: CoordCtx): CoordCtx => {
      const prev = this.model.count
      shape(this.model, $shapeFn, $c)
      if (this.inbox.fresh) {
        reset(this.model, this.snapAnim)
        this.dirty.markAll(Math.max(prev, this.model.count))
        this.inbox.fresh = false
      }
      return $c
    }, { after: [T('scale')] })

    // ④ coord — 纯投影（scale 已定域）
    s.add(T('coord'), ($c: CoordCtx): ITsukiyoLocator =>
      coord(this.model, $coordRule, $c), { after: [T('shape')] })

    // ⑤ paths — 目标几何 + 闭合链
    s.add(T('paths'), ($loc: ITsukiyoLocator): FillRoad | null =>
      paths(this.model, $loc, $roadFn), { after: [T('coord')] })

    // ⑥ interact — 常驻 消费上一帧空间索引
    this.interact?.bind()

    // ⑦ layering — 常驻 为 draw 打包
    this.layering?.bind()

    // ⑧ draw — flush + 生长推进（绘制与生长同一节奏）
    s.add(T('draw'), ($batch: RenderBatch | undefined): true => {
      if (!$batch) return true
      this.renderer.flush(this.model, $batch)
      // 状态以画面已呈现的为准（done 与版本快照落在最终 flush 之后）
      this.pushStatus()
      // 生长末拍的标脏在 layering drain 之后——时钟欠一帧补 flush
      // tick 中段 wake 订帧 自停让位于已订帧
      if (grow(this.model, this.dirty)) this.scheduler.wake()
      return true
    }, { after: [T('layering')], phase: 'draw' })

    // 保活 — 生长还欠拍（snap 图一次到 1）；键在 draw 阶段名上 detach 随阶段丢弃
    s.addKeepAlive(T('draw'), (): boolean => {
      const anim = this.model.anim
      for (let _ξ = 0; _ξ < this.model.count; _ξ++) if (anim[_ξ] < 1) return true
      return false
    })
  }

  // —— public API ——

  /** 绘制状态 — 变更即推送 绝不轮询：idle 无数据 / growing 投递排队或生长中 / done 画完 / paused 停摆或离屏 */
  get status(): TsuStatus {
    if (this.scheduler.state === 'halted' || this.offscreen) return 'paused'
    if (this.model.count === 0) return 'idle'
    if (this.inbox.raw !== null) return 'growing'
    const anim = this.model.anim
    for (let _ξ = 0; _ξ < this.model.count; _ξ++) if (anim[_ξ] < 1) return 'growing'
    return 'done'
  }

  /** 状态卡负载 — 调度器状态 / 槽位数 / 生长中数 */
  statusDetail(): { status: TsuStatus; sched: string; slots: number; growing: number } {
    let _growing = 0
    const anim = this.model.anim
    for (let _ξ = 0; _ξ < this.model.count; _ξ++) if (anim[_ξ] < 1) _growing++
    return { status: this.status, sched: this.scheduler.state, slots: this.model.count, growing: _growing }
  }

  /** 注册状态监听（变更即推送）；返回注销函数 */
  onStatus($cb: ($s: TsuStatus) => void): () => void {
    this.statusCbs.add($cb)
    $cb(this.status)
    return () => { this.statusCbs.delete($cb) }
  }

  private pushStatus(): void {
    const s = this.status
    if (s === this.lastStatus) return
    this.lastStatus = s
    for (const cb of this.statusCbs) cb(s)
  }

  /** 演化模式 — interact 与幽灵域互斥绑定；退出即丢弃暂存 */
  setEvolve($on: boolean): void {
    if ($on === this.evolving) return
    if ($on && this.evolution?.supported !== true) return
    this.evolving = $on
    if ($on) {
      // 演化期禁用相机轨道 / 缩放 / 悬停锁定
      this.pause('interact')
      this.evolution?.bind()
    } else {
      this.evolution?.discard()
      this.evolution?.unbind()
      this.resume('interact')
    }
  }

  /** 每帧生产者钩子 — 由引擎时钟驱动 而非调用方 */
  onFrame($cb: (() => void) | null): this {
    this.frameHook = $cb
    return this
  }

  layers($fn: LayoutFn | null): void {
    this.layering?.layers($fn)
  }

  /** 投递数据 — 暂存 下一 tick 消费（唤醒时钟） */
  data($raw: any[], $dim?: DimConf): this {
    // 演化暂存的锚点即将变化——丢弃暂存（投递的数据获胜）
    this.evolution?.discard()
    this.inbox.raw = $raw
    this.inbox.dim = $dim ?? null
    this.inbox.fresh = true
    this.dirty.markFull()
    this.scheduler.wake()
    this.pushStatus()
    return this
  }

  /** 尺寸 — DOM 事实立即生效 流程随下一 tick */
  resize($w: number, $h: number): this {
    this.canvas.style.width = `${$w}px`
    this.canvas.style.height = `${$h}px`
    const r = Hcvs_retina(this.canvas, $w, $h)
    this.view.w = r.cssWidth
    this.view.h = r.cssHeight
    this.viewGen++
    this.dirty.markFull()
    this.layering?.notify()
    this.scheduler.wake()
    return this
  }

  /** 解绑常驻模块（幂等） */
  pause($name: 'interact' | 'layering'): this {
    ($name === 'interact' ? this.interact : this.layering)?.unbind()
    return this
  }

  /** 重绑常驻模块（幂等） */
  resume($name: 'interact' | 'layering'): this {
    ($name === 'interact' ? this.interact : this.layering)?.bind()
    return this
  }

  /** 卸载全部阶段（连同保活探针） */
  detach(): void {
    for (const $n of STAGES) this.scheduler.remove(this.name($n))
  }

  /** 停机 — 完整自拆：视口守卫 常驻模块 阶段（时钟属 Tsukiyo） */
  stop(): this {
    this.io?.disconnect()
    this.io = null
    this.evolving = false
    this.evolution?.unbind()
    this.toolbar?.destroy()
    this.toolbar = null
    this.evolution = null
    this.interact?.unbind()
    this.layering?.unbind()
    this.detach()
    this.pushStatus()
    return this
  }
}