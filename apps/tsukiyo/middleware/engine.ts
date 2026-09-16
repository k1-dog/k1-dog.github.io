/**
 * engine — 引擎：注册全部 task 到 Scheduler, 装配数据流
 *
 * 数据流 <单一时钟驱动，可追溯> — 六大核心阶段，dataDirty 单标志全链驱动:
 *   input(投递消费) → scale(std 缺省/熔铸 + 维度划分) → point(定型) → coord(定位) → paths(封闭) → layering+draw(布局绘制)
 *
 * 投递语义（方案 A — 全链统一时钟机）:
 *   data()/resize() 在调用线程只做「暂存 + reset('input')」，零 SoA 写入；
 *   下一 tick 的 input task 消费 pending：std 标准化（缺省测绘 = 基元数组快路径，
 *   引擎不预填 dim — scale 阶段的固定缺省值由 std 自身实现）→ loadElements 暂存
 *   → locator 重解析 → dataDirty 置位；随后 point→coord→paths→layering
 *   在同一 tick 内按 after 链严格串行完成（dataDirty 守卫统一驱动，paths 单点清除）。
 *   → SoA 永不出现「新值+旧形」跨 tick 混合态；grid 在 layering 首行
 *     重绘时读到的 coordCtx 必为本轮最新（结构性消灭刻度滞后）。
 *
 * ① input    — 消费 pending 的实体任务（std/loadElements/locator 重解析/dataDirty）
 * ② point    — dataDirty 触发的定型任务（pointFn 写 SoA 图形槽，唯一写入者）
 * ③ coord    — dataDirty 触发的一次性任务：图形定位器 — 只写 x/y，构建 CoordCtx（ruler）返回
 * ④ paths    — dataDirty 触发的一次性任务：图形路径封闭器 — 接收 CoordCtx，写所有非位置几何（h/角度/Δ/偏移）
 *               pathsHook 每帧执行（用户边界，保守设计）
 *               dataDirty 由 engine 在 paths 之后统一清除
 * ⑤ interact — 常驻：hover/click 命中测试（Schedulable，外部事件经 Intake）
 *               注意：interact 在 layering 之前执行，命中测试用上一帧的 spatial 索引（一帧滞后设计）
 * ⑥ layering — 常驻：gridDirty 守卫网格 + spatial update + dirty collect + 视口裁剪（Schedulable）
 * ⑦ draw     — 常驻：render.flush(regionDrawing, regionBigDrawing)
 *
 * engine 是纯调度装配层 — 不含任何布局/绘制逻辑，全部委托 Schedulable 模块
 *
 * 外部 data(raw,dim)/resize() 只投递，tick 内 reset('input') 后 after 链自动重跑
 * pause(name)/resume(name) 幂等暂停/恢复任意 task
 */
import type { DimConf, Renderer, Schedulable, CoordCtx, CoordRule, CoordMapper } from '../yomi'

import { TsuModel } from '../m/model'
import { std } from '../m/std-1'
import { pointTask, PointFn } from '../v/shape'

import { coordTask, resolveCoordLocator } from '../v/coord'
import { pathsTask } from '../v/paths'
import type { PathsHook } from '../v/paths'
import { Scheduler } from './scheduler'

import { Grid } from './spatial'
import { DEFAULT_CELL_SIZE } from '../helper/const'
import { Dirty } from './dirty'
import { Interact } from './interact'
import { Layering } from './layering'
import { Hcvs_retina } from '../helper/canvas'


export interface EngineOpts {
  canvas: HTMLCanvasElement
  renderer: Renderer
  /** 取景相机（2D 恒等 / 3D 相机）— 与 renderer 在工厂成对创建，Grid 聚合区消费 */
  camera: CoordMapper
  pointFn: PointFn
  pathsHook?: PathsHook | null
  coord: string | ((world: { width: number; height: number; dimYCount: number }) => CoordRule)
}

/** 投递载荷 — data()/resize() 暂存，input task 消费（单通道，最后投递胜出） */
interface Pending {
  raw: any[] | null
  dim: DimConf | null
  resized: boolean
}

export class Engine {
  readonly model = new TsuModel()
  readonly scheduler = new Scheduler()
  /** 划分区（脏驱动索引）+ 聚合区（取景相机）— camera 构造注入，与渲染后端成对 */
  readonly spatial: Grid
  readonly dirty = new Dirty()
  private renderer: Renderer
  private canvas: HTMLCanvasElement
  private pointFn: PointFn
  private pathsHook: PathsHook | null = null
  private coordRule: string | ((world: any) => CoordRule)

  // 已解析的坐标定位规则（图形定位器）— coord/paths/layering 共用（单点持有，下游 getter 派生）
  private locator: CoordRule | null = null
  private coordCtx: CoordCtx | null = null
  private viewWidth = 0
  private viewHeight = 0

  // 投递暂存 — data()/resize() 写，input task 消费（tick 外唯一状态写点）
  private pending: Pending = { raw: null, dim: null, resized: false }

  // 交互系统 — Schedulable 模块
  private interact: Interact | null = null

  // 视觉布局系统 — Schedulable 模块（静态层网格 + 动态层布局）
  private layering: Layering | null = null

  // 已暂停的 Schedulable 模块 — resume 时重新 bind
  private paused = new Map<string, Schedulable>()

  constructor($opts: EngineOpts) {
    this.canvas = $opts.canvas
    this.renderer = $opts.renderer
    this.pointFn = $opts.pointFn
    this.pathsHook = $opts.pathsHook ?? null
    this.coordRule = $opts.coord
    this.spatial = new Grid(DEFAULT_CELL_SIZE, $opts.camera)

    // retina 初始化 — 获取 CSS 尺寸供 coord 使用
    const r = Hcvs_retina($opts.canvas)
    this.viewWidth = r.cssWidth
    this.viewHeight = r.cssHeight

    // 创建并绑定交互系统
    this.interact = new Interact($opts.canvas, this.spatial, this.model, this.scheduler)

    // 创建视觉布局系统 — 静态网格层 + 动态层布局
    // 依赖全 getter 回调注入（读取即最新，零双点同步写）
    this.layering = new Layering(
      this.model, this.spatial, this.dirty, this.scheduler,
      $opts.canvas,
      {
        viewWidth: () => this.viewWidth,
        viewHeight: () => this.viewHeight,
        locator: () => this.locator,
        coordCtx: () => this.coordCtx,
      },
    )
    this.layering.initGrid()

    this.registerTasks()
  }

  private registerTasks(): void {
    // ① input — 消费 pending 的实体任务（投递化的初始化阶段，tick 内按序执行）
    // std 标准化 → loadElements 暂存（零 SoA 写入）→ locator 重解析 → gridDirty 置位
    this.scheduler.add('input', () => {
      const p = this.pending
      if (p.raw === null && !p.resized) {
        this.scheduler.complete('input')
        return
      }

      // resize 投递 — 视口尺寸已在调用线程同步更新（DOM/retina 物理事实），此处只重解析定位器
      // dataDirty 置位 — 触发 coord/paths 守卫放行，视口变化重定位（旧直线天然拥有，搬家补链）
      if (p.resized) {
        p.resized = false
        this.locator = resolveCoordLocator(
          this.coordRule, this.viewWidth, this.viewHeight, this.model.dimYMap.size || 1,
        )
        this.model.dataDirty = true
        this.layering?.markGridDirty()
      }

      // data 投递 — scale 阶段：std 标准化（缺省测绘 = 基元数组快路径，不预填 dim）
      // + 暂存元素（SoA 写入权归 point，此处零 SoA 写入）+ dataDirty 置位
      if (p.raw !== null) {
        const elements = std(p.raw, p.dim ?? undefined)
        this.model.raw = p.raw
        this.model.loadElements(elements)
        p.raw = null
        p.dim = null

        // locator 重解析 — dimYCount 可能随新数据变化（radar 角度分配依赖它）
        this.locator = resolveCoordLocator(
          this.coordRule, this.viewWidth, this.viewHeight, this.model.dimYMap.size || 1,
        )
        this.layering?.markGridDirty()
        this.model.dataDirty = true
      }

      this.scheduler.complete('input')
    })

    // ② point — dataDirty 触发的定型任务（after input）— SoA 图形数组唯一写入者
    // pointFn 可能依赖元素数据（el.value 等）— 数据变化必须重定型（与 coord/paths 同机制守卫）
    this.scheduler.add('point', () => {
      if (this.model.dataDirty) {
        pointTask(this.model, this.pointFn)
      }
    }, { after: ['input'] })

    // ③ coord — dataDirty 触发的一次性任务（after point）— 只写 x/y，构建 CoordCtx 返回
    this.scheduler.add('coord', () => {
      if (this.model.dataDirty && this.locator) {
        this.coordCtx = coordTask(this.model, this.locator, this.viewWidth, this.viewHeight)
      }
    }, { after: ['point'] })

    // ④ paths — dataDirty 触发的一次性任务（after coord）
    // 接收 coord 产出的 CoordCtx（含 ruler 结果），写所有非位置几何
    // pathsTask 始终执行 per-element 定型（Rect h / Arc 角度），受 dataDirty 守卫
    // pathsHook 每帧执行（用户边界，保守设计 — 不加 dataDirty 守卫）
    // dataDirty 在所有退出路径上统一清除（含提前 return 的情况）
    this.scheduler.add('paths', () => {
      if (!this.locator || !this.coordCtx) {
        // 提前退出也清除 dataDirty，避免无限重算
        this.model.dataDirty = false
        return
      }
      if (this.model.dataDirty) {
        pathsTask(this.model, this.locator, this.coordCtx)
      }
      if (this.pathsHook) {
        this.pathsHook(this.model, this.locator, this.coordCtx)
      }
      this.model.dataDirty = false
    }, { after: ['coord'] })


    // ⑤ interact — 常驻：hover/click 命中测试（after coord，几何已组装完毕）
    // 注意：interact 用上一帧的 spatial 索引（layering 在其后更新 spatial）— 一帧滞后设计
    if (this.interact) this.interact.bind()

    // ⑥ layering — 常驻：gridDirty 守卫网格 + spatial 更新 + dirty 收集 + 视口裁剪（after paths）
    if (this.layering) this.layering.bind()

    // ⑦ draw — 常驻：renderer.flush（after layering）
    // layering 产出 regionDrawing + regionBigDrawing + 相机（spatial 聚合区），render 纯读取绘制
    this.scheduler.add('draw', () => {
      const layering = this.layering
      if (!layering) return
      const big = layering.regionBigDrawing
      const box = layering.regionDrawing
      if (big.length === 0 || !box) return
      // 第5/6参 — 矩阵与视线同一次取景产出（spatial 聚合区），渲染/命中/光照三方同源
      this.renderer.flush(
        this.model, box, big, this.spatial.cameraMatrix, this.spatial.cameraSight,
      )
    }, { after: ['layering'], phase: 'draw' })
  }

  // —— 公共 API ——

  /** 注入数据 — 投递语义：暂存 pending，下一 tick input task 消费（SoA 写入全部在 tick 内） */
  data($raw: any[], $dim?: DimConf): this {
    this.pending.raw = $raw
    this.pending.dim = $dim ?? null
    this.scheduler.reset('input')
    return this
  }

  /** 设置视图尺寸 — 投递语义：物理尺寸同步设（DOM 事实），数据流部分走 pending 通道（下一 tick 生效） */
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

  /** 幂等暂停 — 移除 Schedulable 模块的 task + 解绑外部资源 */
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

  /** 幂等恢复 — 重新 bind Schedulable 模块 */
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
