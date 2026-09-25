/**
 * engine — 引擎：注册全部 task 到 Scheduler，装配数据流（纯调度装配层，零布局绘制逻辑）。
 * 数据流（dataDirty 单标志全链驱动）：input → scale(std) → point → coord → paths → layering+draw。
 * 投递语义：data()/resize() 只「暂存 + reset('input')」零 SoA 写入；下一 tick input 消费 pending
 * （std → loadEls 暂存 → dataDirty 置位），point→coord→paths→layering 同 tick
 * 按 after 链串行完成（paths 单点清 dataDirty）→ SoA 永不出现「新值+旧形」跨 tick 混合态，
 * grid 重绘读到的 coordCtx 必为本轮最新。
 * coord 阶段单点生产：输入态 locator（仅挂 coordRule）在 ③ coord task 内解析 + 投影 + 挂 ctx，
 * 解析前无消费者（paths/layering/draw 全部 after coord）。
 * ① input 消费 pending ② point 定型（SoA 唯一写入者）③ coord 单点生产 locator（解析+投影）
 * ④ paths 写非位置几何（pathsHook 每帧，保守设计）⑤ interact 常驻（用上一帧 spatial 索引，一帧滞后设计）
 * ⑥ layering 常驻 ⑦ draw 常驻 flush。
 * pause(name)/resume(name) 幂等。
 */
import type { DimConf, Renderer, Schedulable, CoordCtx, CoordRule, CoordMapper, ITsukiyoLocator } from '../yomi'

import { TsuModel } from '../m/model'
import { std } from '../m/std'
import { pointTask, PointFn } from '../v/shape'

import { resolveCoordLocator } from '../v/coord'
import { pathsTask } from '../v/paths'
import type { PathsHook } from '../v/paths'
import { Scheduler } from './scheduler'

import { Grid } from './spatial'
import { DEFAULT_CELL_SIZE } from '../helper/const'
import { Dirty } from './dirty'
import { Interact } from '../v/interact'
import { Layering } from '../v/layering'
import { Hcvs_retina } from '../helper/canvas'


export interface EngineOpts {
  canvas: HTMLCanvasElement
  renderer: Renderer
  camera: CoordMapper   // 与 renderer 工厂成对，Grid 聚合区消费
  pointFn: PointFn
  pathsHook?: PathsHook | null
  coord: CoordRule
}

/** 投递载荷 — 暂存，input 消费（单通道，最后投递胜出） */
interface Pending {
  raw: any[] | null
  dim: DimConf | null
  resized: boolean
}

export class Engine {
  readonly model = new TsuModel()
  readonly scheduler = new Scheduler()
  readonly spatial: Grid       // 划分区 + 聚合区（camera 构造注入）
  readonly dirty = new Dirty()
  private renderer: Renderer
  private canvas: HTMLCanvasElement
  private pointFn: PointFn
  private pathsHook: PathsHook | null = null

  /** 坐标系定位器 — 唯一 coord 状态：输入态（仅 coordRule）→ coord task 解析 → 完整规则 + ctx */
  private locator: ITsukiyoLocator | null = null
  private viewWidth = 0
  private viewHeight = 0

  private pending: Pending = { raw: null, dim: null, resized: false }   // 投递暂存

  private interact: Interact | null = null
  private layering: Layering | null = null
  private paused = new Map<string, Schedulable>()   // 暂停集（resume 重 bind）

  constructor($opts: EngineOpts) {
    this.canvas = $opts.canvas
    this.renderer = $opts.renderer
    this.pointFn = $opts.pointFn
    this.pathsHook = $opts.pathsHook ?? null
    this.locator = { coordRule: $opts.coord } as ITsukiyoLocator   // 输入态 — coord task 解析
    this.spatial = new Grid(DEFAULT_CELL_SIZE, $opts.camera)

    // retina 初始化（CSS 尺寸供 coord）
    const r = Hcvs_retina($opts.canvas)
    this.viewWidth = r.cssWidth
    this.viewHeight = r.cssHeight

    this.interact = new Interact($opts.canvas, this.spatial, this.model, this.scheduler)

    // layering — 依赖全 getter 注入（读取即最新）
    this.layering = new Layering(
      this.model, this.spatial, this.dirty, this.scheduler,
      $opts.canvas,
      {
        viewWidth: () => this.viewWidth,
        viewHeight: () => this.viewHeight,
        locator: () => this.locator,
      },
    )
    this.layering.initGrid()

    this.registerTasks()
  }

  private registerTasks(): void {
    // ① input — 消费 pending（std → loadEls 暂存 → 置位）
    this.scheduler.add('input', () => {
      const p = this.pending
      if (p.raw === null && !p.resized) {
        this.scheduler.complete('input')
        return
      }

      // resize — 尺寸已同步更新（DOM 事实），此处只置位（coord task 用新尺寸重解析重投影）
      if (p.resized) {
        p.resized = false
        this.model.dataDirty = true
        this.layering?.markGridDirty()
      }

      // data — std 标准化 + 暂存元素（SoA 写入权归 point）+ 置位
      if (p.raw !== null) {
        const elements = std(p.raw, p.dim ?? undefined)
        this.model.raw = p.raw
        this.model.loadEls(elements)
        p.raw = null
        p.dim = null

        this.layering?.markGridDirty()
        this.model.dataDirty = true
      }

      this.scheduler.complete('input')
    })

    // ② point — 定型（after input）— SoA 图形数组唯一写入者（pointFn 依赖元素数据，必须随数据重定型）
    this.scheduler.add('point', () => {
      if (this.model.dataDirty) {
        pointTask(this.model, this.pointFn)
      }
    }, { after: ['input'] })

    // ③ coord — 单点生产（after point）：解析规则 → 投影 → 挂 ctx（解析前无消费者）
    this.scheduler.add('coord', () => {
      if (!this.model.dataDirty || !this.locator) return
      this.locator = resolveCoordLocator(
        this.locator.coordRule as CoordRule, this.model, this.viewWidth, this.viewHeight,
      )
    }, { after: ['point'] })

    // ④ paths — 封闭（after coord）— 接收 locator.ctx 写非位置几何（受 dataDirty 守卫）；
    // pathsHook 每帧执行（用户边界，保守设计）；dataDirty 所有退出路径统一清除
    this.scheduler.add('paths', () => {
      if (!this.locator || !this.locator.ctx) {
        this.model.dataDirty = false   // 提前退出也清除，避免无限重算
        return
      }
      if (this.model.dataDirty) {
        pathsTask(this.model, this.locator)
      }
      if (this.pathsHook) {
        this.pathsHook(this.model, this.locator, this.locator.ctx)
      }
      this.model.dataDirty = false
    }, { after: ['coord'] })

    // ⑤ interact — 常驻（after coord；用上一帧 spatial 索引，一帧滞后设计）
    if (this.interact) this.interact.bind()

    // ⑥ layering — 常驻（after paths）
    if (this.layering) this.layering.bind()

    // ⑦ draw — 常驻 flush（after layering）— render 纯读取绘制
    this.scheduler.add('draw', () => {
      const layering = this.layering
      if (!layering) return
      const big = layering.regionBigDrawing
      const box = layering.regionDrawing
      if (big.length === 0 || !box) return
      // 矩阵与视线同一次取景产出（三方同源）
      this.renderer.flush(
        this.model, box, big, this.spatial.cameraMatrix, this.spatial.cameraSight,
      )
    }, { after: ['layering'], phase: 'draw' })
  }

  // —— 公共 API ——

  /** 注入数据 — 暂存 pending，下一 tick 消费（SoA 写入全在 tick 内） */
  data($raw: any[], $dim?: DimConf): this {
    this.pending.raw = $raw
    this.pending.dim = $dim ?? null
    this.scheduler.reset('input')
    return this
  }

  /** 尺寸 — 物理同步设（DOM 事实），数据流走 pending（下一 tick 生效） */
  resize($w: number, $h: number): this {
    this.canvas.style.width = `${$w}px`
    this.canvas.style.height = `${$h}px`
    const r = Hcvs_retina(this.canvas)
    this.viewWidth = r.cssWidth
    this.viewHeight = r.cssHeight
    this.pending.resized = true
    this.scheduler.reset('input')
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

  /** 启动引擎 */
  start(): this {
    this.scheduler.start()
    return this
  }

  /** 停止引擎 */
  stop(): this {
    this.scheduler.stop()
    return this
  }
}