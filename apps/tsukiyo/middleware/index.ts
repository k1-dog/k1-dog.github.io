/**
 * Tsukiyo — 链式入口：命令式组合——图表类型 = 坐标规则 + 形状映射（严禁按类型建类）
 * 时钟（Scheduler）与相机只在此创建
 */
import type { DimConf, RenderMode, CoordRule, RoadFn, RoadRule, LayoutFn } from '../yomi'
import { Engine } from './engine'
import { createRenderer } from '../v/render'
import type { ShapeFn } from '../v/shape'
import { Shapes, defaultShapeFn } from '../v/shape'
import { defaultRoad } from '../v/paths'
import { Scheduler } from './scheduler'

export class Tsukiyo {
  private canvas: HTMLCanvasElement
  private engine: Engine | null = null
  private raw: any[] = []
  private dim: DimConf | undefined
  private shapeFn: ShapeFn = defaultShapeFn
  private roadFn: RoadFn | RoadRule = defaultRoad
  private coordRule: CoordRule = 'Bar'
  private snapAnim = false
  private layoutFn: LayoutFn | null = null

  constructor($canvas: HTMLCanvasElement) {
    this.canvas = $canvas
  }

  input($raw: any[]): this {
    this.raw = $raw
    return this
  }

  /** 维度划分 — dimX 字段 + dimY 字段列表 */
  scale($dim: DimConf): this {
    this.dim = $dim
    return this
  }

  shape($fn: ShapeFn): this {
    this.shapeFn = $fn
    return this
  }

  coord($rule: CoordRule): this {
    this.coordRule = $rule
    return this
  }

  /** 链路声明 — RoadRule（loop/step/by/fill）或 RoadFn 回调（链路语义唯一来源） */
  paths($rule?: RoadFn | RoadRule): this {
    this.roadFn = $rule ?? defaultRoad
    return this
  }

  /** 生长通道 — 'snap' 冻结 anim=1 以支持每帧重灌数据 */
  anim($mode: 'grow' | 'snap'): this {
    this.snapAnim = $mode === 'snap'
    return this
  }

  /** 子层 — 每层是完整子引擎；缺省 = 网格背景 */
  layering($fn?: LayoutFn): this {
    this.layoutFn = $fn ?? null
    return this
  }

  /** draw — 建引擎、灌数据、启动时钟；'3d' 在 WebGPU 不可用时回落 2d */
  async draw($mode: RenderMode = '2d'): Promise<Engine> {
    const { renderer, camera } = await createRenderer(this.canvas, $mode)
    const scheduler = new Scheduler()
    const engine = new Engine({
      canvas: this.canvas,
      renderer,
      camera,
      scheduler,
      shapeFn: this.shapeFn,
      roadFn: this.roadFn,
      coord: this.coordRule,
      snapAnim: this.snapAnim,
    })
    this.engine = engine
    engine.layers(this.layoutFn)
    engine.resize(this.canvas.offsetWidth || 0, this.canvas.offsetHeight || 0)
    engine.data(this.raw, this.dim)
    scheduler.start()
    return engine
  }

  data($raw: any[], $dim?: DimConf): this {
    if (!this.engine) {
      this.raw = $raw
      this.dim = $dim ?? this.dim
      return this
    }
    this.engine.data($raw, $dim ?? this.dim)
    return this
  }

  getEngine(): Engine | null {
    return this.engine
  }

  destroy(): void {
    if (!this.engine) return
    const scheduler = this.engine.scheduler
    this.engine.stop()
    scheduler.stop()
    this.engine = null
  }
}
