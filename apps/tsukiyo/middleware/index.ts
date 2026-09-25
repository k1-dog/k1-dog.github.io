/**
 * Tsukiyo — 链式可视化入口（命令式组合，非每图一个类）：
 * 图表类型 = coord 规则 + point 映射的组合。
 * .eg new Tsukiyo(canvas).input([10,20,100]).coord('Bar')
 *        .point((el,p,i) => Shapes.rect(30, el.value)).draw()  // 更新：chart.data([50,60,70])
 */
import type { DimConf, Element, Plugins, RenderMode, CoordRule } from '../yomi'
import { Engine } from './engine'
import { createRenderer } from '../v/render'
import type { PointFn } from '../v/shape'
import { Shapes } from '../v/shape'
import { Hm_palette as palette } from '../helper/maths'
import type { PathsHook } from '../v/paths'


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
  private pathsHook: PathsHook | null = null
  private coordRule: CoordRule = 'Bar'


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

  // 路径阶段 — hook 拦截封闭路径
  paths($hook?: PathsHook): this {
    this.pathsHook = $hook ?? null
    return this
  }

  // 占位 — layering 在 engine 内自动装配
  layering(): this {
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
      pathsHook: this.pathsHook,
      coord: this.coordRule,
    })

    this.engine.data(this.raw, this.dim)
    this.engine.start()
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
