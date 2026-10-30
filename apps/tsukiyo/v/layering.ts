/**
 * v/layering — layering 阶段：为 draw 打视觉包
 * 取景 + 变更收拢成重绘域 + 剔除 + 子层编排；每层（含网格背景）同构记录
 * 产物 RenderBatch { area, bigArea, road, view }
 */
import type { ITsukiyoLocator, Aabb, LayoutFn, LayerConf, FillRoad, RenderBatch, View, CoordMapper, LayerPaint } from '../yomi'
import type { TsuModel } from '../m/model'
import type { TsuSpace } from '../middleware/spatial'
import { boxInto, contentArea } from '../middleware/spatial'
import type { TsuDirty } from '../middleware/dirty'
import type { Scheduler } from '../middleware/scheduler'
import type { Engine } from '../middleware/engine'
import { Hcvs_retina } from '../helper/canvas'
import { drawGrid } from './grid'
import { DIRTY_PAD_RATIO, DIRTY_PAD_PX } from '../helper/const'

/** 单层 — 子引擎或自绘钩子（paint） 二者取一 */
interface Layer {
  canvas: HTMLCanvasElement
  conf: LayerConf
  engine: Engine | null
}

export interface LayeringDeps {
  viewWidth: () => number
  viewHeight: () => number
  createSubEngine: ($canvas: HTMLCanvasElement, $conf: LayerConf, $w: number, $h: number) => Promise<Engine>
}

const padBuf: Aabb = [[0, 0], [0, 0]]

/** 空域 — 只让 draw 推进生长通道（生长槽全被剔除）不碰画布 */
const EMPTY: Aabb = [[0, 0], [0, 0]]

export class Layering {
  readonly taskName: string

  private model: TsuModel
  private space: TsuSpace
  private dirty: TsuDirty
  private scheduler: Scheduler
  private camera: CoordMapper
  private canvas: HTMLCanvasElement
  private deps: LayeringDeps

  private layoutFn: LayoutFn | null = null
  private recs: Layer[] = []
  private aabbBuf: Aabb = [[0, 0], [0, 0]]
  /** stage-name prefix — stage names are derived, never stored twice */
  private prefix: string

  constructor(
    $model: TsuModel, $space: TsuSpace, $dirty: TsuDirty, $scheduler: Scheduler,
    $camera: CoordMapper, $canvas: HTMLCanvasElement, $deps: LayeringDeps, $taskPrefix = '',
  ) {
    this.model = $model
    this.space = $space
    this.dirty = $dirty
    this.scheduler = $scheduler
    this.camera = $camera
    this.canvas = $canvas
    this.deps = $deps
    this.prefix = $taskPrefix
    this.taskName = $taskPrefix + 'layering'
  }

  // —— layers ——

  /** the default layout — grid background as one self-painting layer */
  private static readonly DEFAULT: LayoutFn = () => ({ layers: [{ z: -1, paint: drawGrid }] })

  layers($fn: LayoutFn | null): void {
    this.layoutFn = $fn
    this.destroyLayers()
  }

  /** data / size changed — forward to the sub-engines (view unchanged) */
  notify(): void {
    this.resizeLayers(false)
  }

  private buildLayers($w: number, $h: number): void {
    this.destroyLayers()
    const parent = this.canvas.parentElement
    if (!parent) return
    this.ensureParentPosition()

    const confs = (this.layoutFn ?? Layering.DEFAULT)().layers.slice().sort(($a, $b) => $a.z - $b.z)
    for (const conf of confs) {
      const canvas = this.makeCanvas(conf.z, conf.size, $w, $h)
      const layer: Layer = { canvas, conf, engine: null }
      this.recs.push(layer)
      if (conf.paint || !conf.shape) continue

      this.deps.createSubEngine(canvas, conf, $w, $h).then(($sub) => {
        if (!this.recs.includes(layer)) {
          $sub.stop()
          canvas.remove()
          return
        }
        layer.engine = $sub
        this.resizeLayers(false)
      }, ($err) => {
        console.error(`[tsukiyo] layer z=${conf.z} failed to build`, $err)
        layer.conf = { ...layer.conf, paint: undefined, shape: undefined }
      })
    }
  }

  /** layer canvas — placement and size are the retina entry's business */
  private makeCanvas($z: number, $size: 'host' | undefined, $w: number, $h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.classList.add('tsukiyo-chart__layer')
    Hcvs_retina(canvas, $w, $h, null, { z: $z, size: $size, main: this.canvas })
    return canvas
  }

  /** the main canvas needs a positioned parent for the absolute layers */
  private ensureParentPosition(): void {
    const parent = this.canvas.parentElement
    if (!parent) return
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative'
    if (getComputedStyle(this.canvas).position === 'static') {
      this.canvas.style.position = 'relative'
      this.canvas.style.zIndex = '1'
    }
  }

  /** sub-layer resize — single entry: host-glued layers track the host box,
   *  the rest track the main viewport; a moved view re-frames followers */
  private resizeLayers($viewMoved: boolean): void {
    const w = this.deps.viewWidth()
    const h = this.deps.viewHeight()
    const host = this.canvas.parentElement
    for (const layer of this.recs) {
      const engine = layer.engine
      if (!engine) continue
      if (layer.conf.size === 'host') {
        const hw = host?.offsetWidth ?? 0
        const hh = host?.offsetHeight ?? 0
        if (hw > 0 && hh > 0) engine.resize(hw, hh)
        continue
      }
      if ($viewMoved && layer.conf.followView) engine.resize(w, h)
    }
  }

  private destroyLayers(): void {
    for (const layer of this.recs) {
      layer.engine?.stop()
      layer.canvas.remove()
    }
    this.recs = []
  }

  // —— stage contract ——

  bind(): void {
    // 输入 = coord 与 paths 的产物——按声明序注入
    this.scheduler.add(this.taskName, ($locator?: ITsukiyoLocator | null, $road?: FillRoad | null) =>
      this.task($locator ?? null, $road ?? null), {
      after: [this.prefix + 'coord', this.prefix + 'paths'],
      always: true,
    })
  }

  unbind(): void {
    this.scheduler.remove(this.taskName)
    this.destroyLayers()
  }

  /** layering 阶段 — 取景 → 收拢变更 → 剔除 → 打包
   *  无变更则不产出（空转闸 ④）——draw 保留上轮产物 时钟可自停 */
  task($locator: ITsukiyoLocator | null, $road: FillRoad | null): RenderBatch | undefined {
    const w = this.deps.viewWidth()
    const h = this.deps.viewHeight()
    const m = this.model

    if (w <= 0 || h <= 0) return { area: null, bigArea: [], road: $road, view: this.camera.view }

    // ① 取景 — 内容区是唯一取景源；初始缩放由相机吸收一次
    const view: View = this.camera.view
    const moved = this.camera.frame(contentArea(m), w, h, $locator?.init?.zoom)

    if (this.recs.length === 0) this.buildLayers(w, h)
    else if (moved) this.resizeLayers(true)

    this.paint(w, h, $locator, moved || this.recs.length === 0)

    // ② 视图移动 — 全槽重变换 → 整画布重绘
    if (moved) this.dirty.markFull()

    // ③ 变更槽 — 旧位 + 新位并入重绘域
    const drained = this.dirty.drain()
    const touched = drained.length > 0
    for (const ξ of drained) {
      const old = this.space.aabbOf(ξ)
      if (old) this.dirty.markArea(old)
      if (ξ >= m.count) {
        this.space.remove(ξ)     // 退役槽——丢弃空间记录
        continue
      }
      const box = boxInto(m, ξ, this.aabbBuf)
      if (this.camera.culled(box, w, h)) {
        this.dirty.mark(ξ)       // 被剔除——重新排队直到回视口
        continue
      }
      this.dirty.markArea(pad(box))
      if (old) this.space.update(ξ, box)
      else this.space.insert(ξ, box)
    }

    // ③ʹ 闭合链域 — 填充底板裁剪到重绘域 自身包围盒必须并入脏域
    //    链槽本身只盖边界窄带（否则填充内部永不重绘）
    if ($road) this.dirty.markArea(pad($road.area))

    // ④ 空转闸 — Λ 无 full 标记时折叠为 null 即无变更：本 tick 不产出
    //    仍欠工作的已排水槽（生长槽全被剔除）传 EMPTY 域——draw 只推进生长
    const fullAsked = this.dirty.isFull
    const area = this.dirty.Λ()
    if (area === null && !fullAsked && !touched) return undefined

    // ⑤ 大域 — 单次遍历单谓词：先剔除（廉价的视口测试）再测重绘域
    const bigArea: number[] = []
    const [rMin, rMax] = area ?? [[-Infinity, -Infinity], [Infinity, Infinity]]
    for (let _ξ = 0; _ξ < m.count; _ξ++) {
      const box = boxInto(m, _ξ, this.aabbBuf)
      if (this.camera.culled(box, w, h)) continue
      if (box[1][0] < rMin[0] || box[0][0] > rMax[0] || box[1][1] < rMin[1] || box[0][1] > rMax[1]) continue
      bigArea.push(_ξ)
    }

    return { area: area ?? (fullAsked ? null : EMPTY), bigArea, road: $road, view }
  }

  /** 视图施加到本引擎每个画布（单循环） */
  private paint($w: number, $h: number, $locator: ITsukiyoLocator | null, $repaint: boolean): void {
    const m = this.camera.view.m
    Hcvs_retina(this.canvas, $w, $h, m)
    for (const layer of this.recs) {
      Hcvs_retina(layer.canvas, $w, $h, m)
      const paint = layer.conf.paint
      if (!paint || !$repaint) continue
      const ctx = layer.canvas.getContext('2d')
      if (!ctx) continue
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      ctx.restore()
      paint(ctx, $w, $h, this.model, $locator)
    }
  }
}

/** 盒外扩 — 覆盖悬停缩放与描边溢出 */
function pad($box: Aabb): Aabb {
  const cx = ($box[0][0] + $box[1][0]) / 2
  const cy = ($box[0][1] + $box[1][1]) / 2
  const hw = (($box[1][0] - $box[0][0]) / 2) * DIRTY_PAD_RATIO + DIRTY_PAD_PX
  const hh = (($box[1][1] - $box[0][1]) / 2) * DIRTY_PAD_RATIO + DIRTY_PAD_PX
  padBuf[0][0] = cx - hw; padBuf[0][1] = cy - hh
  padBuf[1][0] = cx + hw; padBuf[1][1] = cy + hh
  return padBuf
}