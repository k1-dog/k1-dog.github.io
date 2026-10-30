/**
 * v/render — draw 阶段、Canvas2D 后端；形状零原语分支：槽位主路径已在 shape / paths
 * 阶段由 Pen 记录、本阶段只做「设置样式 → fill/stroke 缓存的 Path2D」按连续 run 批绘
 * 纯读取者 —— 不写脏域、不写动画
 */
import type { Renderer, RenderBatch, RenderMode } from '../yomi'
import type { TsuModel } from '../m/model'
import { WebGPU3D } from './render-3d'
import { CoordMapper2D, CoordMapper3D } from './camera3'
import type { CoordMapper } from '../yomi'
import { Hm_rgbaStr, Hm_color, Hm_alphaFill } from '../helper/maths'
import { Hcvs_batch } from '../helper/canvas'
import { specOf, rebuildBox } from './shape'
import { Pen } from './pen'
import {
  HOVER_SCALE, STROKE_NORMAL, STROKE_LOCKED, TEXT_DEFAULT_SIZE,
} from '../helper/const'

/** 打包色 → css 字符串——按打包值记忆（热循环零抖动） */
const cache = new Map<number, string>()
function css($packed: number): string {
  let _s = cache.get($packed)
  if (_s === undefined) {
    _s = Hm_rgbaStr($packed)
    cache.set($packed, _s)
  }
  return _s
}

/** 生长重跑 geo 用的复用画笔（flush 串行、零每帧分配） */
const pen = new Pen()

class Canvas2D implements Renderer {
  private ctx: CanvasRenderingContext2D | null = null
  private canvas: HTMLCanvasElement | null = null

  init($canvas: HTMLCanvasElement): void {
    this.canvas = $canvas
    this.ctx = $canvas.getContext('2d')
  }

  flush($model: TsuModel, $batch: RenderBatch): void {
    const ctx = this.ctx
    if (!ctx || !this.canvas) return

    // 清屏由区域驱动而非槽列表——空的大区域仍要擦掉上一拍画过的像素
    const area = $batch.area
    if (area) {
      // 区域在图表空间——与激活视口变换同空间、clearRect/clip 直接在此运行
      const [[x0, y0], [x1, y1]] = area
      ctx.clearRect(x0, y0, x1 - x0, y1 - y0)
      ctx.save()
      ctx.beginPath()
      ctx.rect(x0, y0, x1 - x0, y1 - y0)
      ctx.clip()
    } else {
      // 整画布清屏——必须在设备空间：视口变换仍在生效（DPR × zoom × gaze）、
      // 图表空间 clearRect 只擦到 [gaze, gaze + size × zoom]——缩小后留旧像素圈（快速平移还会拖影）
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      ctx.restore()
    }

    // 底衬 — 闭合链路填充——在描边之下、同一 clip 之内
    const road = $batch.road
    if (road && road.paths.length > 0) {
      ctx.fillStyle = css(road.color)
      for (const path of road.paths) ctx.fill(path)
    }

    // 连续 run 批绘 —— 数据序 = 绘制序 = z 序
    for (const b of Hcvs_batch($model, $batch.bigArea)) this.run(ctx, $model, b.id, b.indices)
    if (area) ctx.restore()
  }

  private run($ctx: CanvasRenderingContext2D, $model: TsuModel, $id: number, $indices: number[]): void {
    const spec = specOf($id)
    if (!spec) return

    const stroke = css(Hm_color.stroke)
    $ctx.setLineDash(spec.dash ?? [])

    for (const i of $indices) {
      const fill = $model.fill[i]
      const t = $model.anim[i]
      if (t <= 0) continue                       // 尚未入场（λDelay 起步为负）
      const hover = $model.hoverSlots.has(i)
      const locked = hover || $model.clickSlots.has(i)
      const fillCss = css(fill)
      const x = $model.x[i]
      const y = $model.y[i]

      // 文字 — 唯一不经 Path2D 的形状
      if (spec.text) {
        const el = $model.vToM(i)
        const text = el?.text ?? el?.value ?? ''
        const size = $model.h[i] > 0 ? $model.h[i] : TEXT_DEFAULT_SIZE
        $ctx.font = `${size}px sans-serif`
        $ctx.textBaseline = 'top'
        $ctx.fillStyle = fillCss
        $ctx.fillText(String(text), x, y)
        continue
      }

      // 生长 —— 不是缩放路径、而是**按进度重跑 geo**：
      // 几何语义由 spec.kind / spec.tween 决定（柱长高、扇扫角、线伸张、圆扩径）
      let _path = $model.paths[i]
      if (!_path) continue
      if (t < 1) {
        const b = rebuildBox($model, i, spec, t)
        pen.reset()
        spec.geo(b as any, pen)
        _path = pen.path
      }

      // 路径是**局部坐标**、原点即锚点（由 spec.geo 自己决定画在哪一侧）
      // 因此这里只有一次 translate —— 没有 center / baseBottom 之类的框架开关
      const grow = hover ? HOVER_SCALE : 1
      $ctx.save()
      $ctx.translate(x, y)
      if (grow !== 1) $ctx.scale(grow, grow)

      if (spec.fill) {
        $ctx.fillStyle = spec.kind === 'arc' || spec.kind === 'triangle'
          ? css(Hm_alphaFill(fill, spec.kind === 'arc' ? 'pie' : 'radar'))
          : css(Hm_alphaFill(fill, 'rect'))
        $ctx.fill(_path)
      } else {
        $ctx.lineCap = 'round'
        $ctx.lineWidth = locked ? STROKE_LOCKED : (spec.lineWidth ?? STROKE_NORMAL)
        $ctx.strokeStyle = locked ? stroke : fillCss
        $ctx.stroke(_path)
      }

      // 子图形（Pen.add 产生）—— 生长期用重跑后的、稳态用缓存的
      const subs = t < 1 ? pen.subs : $model.subs[i]
      if (subs) {
        for (const sub of subs) {
          if (spec.fill) $ctx.fill(sub)
          else $ctx.stroke(sub)
        }
      }

      // 锁定高亮 —— 填充形状补一圈描边
      if (locked && spec.fill) {
        $ctx.lineWidth = STROKE_LOCKED
        $ctx.strokeStyle = stroke
        $ctx.stroke(_path)
      }

      $ctx.restore()
    }

    $ctx.setLineDash([])
  }
}

/** 后端 + 配对相机 — 唯一工厂：相机只在此创建（子层传 share 共乘父层相机） */
export async function createRenderer(
  $canvas: HTMLCanvasElement,
  $mode: RenderMode = '2d',
  $share?: CoordMapper | null,
): Promise<{ renderer: Renderer; camera: CoordMapper }> {
  if ($mode === '3d') {
    const g3d = new WebGPU3D()
    if (await g3d.init($canvas)) return { renderer: g3d, camera: $share ?? new CoordMapper3D() }
    console.warn('[tsukiyo] 3D unavailable — falling back to Canvas2D')
  }
  const c2d = new Canvas2D()
  c2d.init($canvas)
  return { renderer: c2d, camera: $share ?? new CoordMapper2D() }
}
