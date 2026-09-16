/**
 * Tsukiyo — 月读，链式可视化入口
 *
 * 用法（命令式组合，非每图一个类）：
 *
 *   const chart = new Tsukiyo(canvas)
 *     .input([10, 20, 100])
 *     .coord('Bar')
 *     .point((el, p, i) => Shapes.rect(30, el.value))
 *     .draw()
 *
 *   // 后续更新数据
 *   chart.data([50, 60, 70])
 *
 * 图表类型 = coord 规则 + point 映射的组合，不是独立类。
 * Bar = coord('Bar') + point(rect)
 * Line = coord('Line') + point(line)
 * Radar = coord('radar') + point(line)
 */
import type { DimConf, Element, Plugins, RenderMode } from '../yomi'
import { Engine } from '../middleware/engine'
import { createRenderer } from './render'
import type { PointFn } from './shape'
import { Shapes } from './shape'
import { Hm_palette as palette } from '../helper/maths'
import type { PathsHook } from './paths'


// 默认 pointFn — 根据元素生成基础形状
function defaultPointFn($el: Element, $plugins: Plugins, $index: number) {
  // 值越大柱越宽，简单默认
  return Shapes.rect(30, $el.value, palette.primary)
}

export class Tsukiyo {
  private canvas: HTMLCanvasElement
  private engine: Engine | null = null
  private raw: any[] = []
  private dim: DimConf | undefined
  private pointFn: PointFn = defaultPointFn
  private pathsHook: PathsHook | null = null
  private coordRule: string | ((world: { width: number; height: number; dimYCount: number }) => any) = 'Bar'


  constructor($canvas: HTMLCanvasElement) {
    this.canvas = $canvas
  }

  /** 注入原始数据 */
  input($raw: any[]): this {
    this.raw = $raw
    return this
  }

  /** 维度配置（等价于 scale，语义更直观） */
  scale($dim: DimConf): this {
    this.dim = $dim
    return this
  }

  /** 自定义 point 映射函数 */
  point($fn: PointFn): this {
    this.pointFn = $fn
    return this
  }

  /** 选择坐标系规则 */
  coord($rule: string | ((world: { width: number; height: number; dimYCount: number }) => any)): this {
    this.coordRule = $rule
    return this
  }

  /** 路径阶段 — 图形路径规划器。注入自定义 hook 拦截封闭路径规则 */
  paths($hook?: PathsHook): this {
    this.pathsHook = $hook ?? null
    return this
  }

  /** 占位 — layering 在 engine 内自动装配，链式调用保持语义完整 */
  layering(): this {
    return this
  }

  /** 启动渲染 — 异步初始化 renderer 后创建 engine。$mode='3d' 时 WebGPU 不可用自动回退 2d */
  async draw($mode: RenderMode = '2d'): Promise<Engine> {
    // 渲染后端与取景相机成对产出（回退 2d 时相机同步降级恒等 — 结构性防漂移）
    const { renderer, camera } = await createRenderer(this.canvas, $mode)
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

  /** 更新数据（引擎运行后） */
  data($raw: any[], $dim?: DimConf): this {
    if (!this.engine) {
      this.raw = $raw
      this.dim = $dim ?? this.dim
      return this
    }
    this.engine.data($raw, $dim ?? this.dim)
    return this
  }

  /** 获取底层引擎（高级用法） */
  getEngine(): Engine | null {
    return this.engine
  }

  /** 停止渲染 */
  destroy(): void {
    this.engine?.stop()
  }
}
