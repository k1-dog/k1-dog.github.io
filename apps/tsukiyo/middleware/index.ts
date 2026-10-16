/**
 * Tsukiyo — 链式可视化入口（命令式组合，非每图一个类）：
 * 图表类型 = coord 规则 + point 映射的组合。
 * .eg new Tsukiyo(canvas).input([10,20,100]).coord('Bar')
 *        .point((el,p,i) => Shapes.rect(30, el.value)).draw()  // 更新：chart.data([50,60,70])
 */
import type { DimConf, Element, Plugins, RenderMode, CoordRule, SealFn, LayoutFn } from '../yomi'
import { Engine } from './engine'
import { createRenderer } from '../v/render'
import type { PointFn } from '../v/shape'
import { Shapes } from '../v/shape'
import { Hm_palette as palette } from '../helper/maths'
import { defaultSeal } from '../v/paths'


// 默认 pointFn
function defaultPointFn($el: Element, $plugins: Plugins, $index: number) {
  return Shapes.rect(30, $el.value, palette.primary)
}

export class Tsukiyo {
  private canvas: HTMLCanvasElement
  private engine: Engine | null = null
  private raw: any[] = []
  private dim: DimConf | undefined
  private pointFn: PointFn = defaultPointFn
  private sealFn: SealFn = defaultSeal
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

  // 维度配置（等价 scale）
  scale($dim: DimConf): this {
    this.dim = $dim
    return this
  }

  point($fn: PointFn): this {
    this.pointFn = $fn
    return this
  }

  coord($rule: CoordRule): this {
    this.coordRule = $rule
    return this
  }

  // 路径阶段 — 跨图形封闭回调（Line/Curve 的 Δ 连接唯一事实源）
  // 不传 = defaultSeal（{Δi: i+1}，折线系列紧密连接）
  paths($fn?: SealFn): this {
    this.sealFn = $fn ?? defaultSeal
    return this
  }

  // anim 通道模式 — 'snap' 定格 anim=1（逐帧数据重投场景）；缺省 'grow' 生长动画
  anim($mode: 'grow' | 'snap'): this {
    this.snapAnim = $mode === 'snap'
    return this
  }

  // layering 分层回调 — 每层 = 独立子引擎（canvas 层 + 完整核心工作流），
  // layoutRule { layers } 按数字 z 排序（z<0 主 canvas 下 / z>0 上）；
  // 不传 = 默认 grid 网格背景层
  layering($fn?: LayoutFn): this {
    this.layoutFn = $fn ?? null
    return this
  }

  // 启动渲染 — '3d' 回退 2d 自动
  async draw($mode: RenderMode = '2d'): Promise<Engine> {
    const { renderer, camera } = await createRenderer(this.canvas, $mode)   // 成对产出
    this.engine = new Engine({
      canvas: this.canvas,
      renderer,
      camera,
      pointFn: this.pointFn,
      sealFn: this.sealFn,
      coord: this.coordRule,
    })
    this.engine.model.snapAnim = this.snapAnim

    this.engine.data(this.raw, this.dim)
    this.engine.start()
    // layering 分层注册（engine 装配完成后；null = 默认 grid 层）
    this.engine.layers(this.layoutFn)
    return this.engine
  }

  // 更新数据（引擎运行后）
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
    // 释放完全 — 解绑 DOM 事件（interact）+ 停网格（layering）+ 停调度器
    this.engine?.pause('interact')
    this.engine?.pause('layering')
    this.engine?.stop()
  }
}
