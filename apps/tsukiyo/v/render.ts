/**
 * render — 渲染器（纯绘制层，不读写 dirty/anim）：
 * 按原语分桶批渲染（同类型一起画减 GPU 状态切换）+ 脏区域裁剪只重绘变化区域。
 * 动画缩放只读 anim 按锚点解读（Rect 底部/Arc 扫描/Line 起点/Triangle 圆心）。
 * flush(model, regionDrawing, regionBigDrawing)：重绘域 = 脏 AABB 合并 → clearRect+clip；
 * 大名单 = 脏元素 ∪ 域内相交非脏（layering 产出）。
 */

import type { Renderer, Bounds, Prim, RenderMode } from '../yomi'
import { Prim as P } from '../yomi'
import type { TsuModel } from '../m/model'
import { WebGPU3D } from './render-3d'
import { CoordMapper2D, CoordMapper3D } from './camera3'
import type { CoordMapper } from '../yomi'
import { Hm_rgbaStr, Hm_alphaFill, Hm_palette } from '../helper/maths'
import { Hcvs_batch } from '../helper/canvas'
import {
  CURVE_NORMAL_RATIO, GEO_SLOTS_EACH_ELEM, TAU, TEXT_DEFAULT_SIZE,
  HOVER_SCALE, STROKE_NORMAL, STROKE_LOCKED, ARC_GAP_EPS,
} from '../helper/const'


// —— Canvas2D 后端 ——
class Canvas2D implements Renderer {
  private ctx: CanvasRenderingContext2D | null = null
  private canvas: HTMLCanvasElement | null = null

  init($canvas: HTMLCanvasElement): void {
    this.canvas = $canvas
    this.ctx = $canvas.getContext('2d')
  }

  // clipMatrix 恒忽略（全清全重绘由 layering 保证）
  flush($model: TsuModel, $regionDrawing: Bounds | null, $regionBigDrawing?: number[], $_clipMatrix?: Float32Array | null): void {
    const ctx = this.ctx

    if (!ctx || !this.canvas) return
    const big = $regionBigDrawing ?? []
    if (big.length === 0) return

    const w = this.canvas.width
    const h = this.canvas.height

    if ($regionDrawing) {
      const [min, max] = $regionDrawing
      ctx.clearRect(min[0], min[1], max[0] - min[0], max[1] - min[1])
    } else {
      ctx.clearRect(0, 0, w, h)
    }

    // clip 到重绘域
    if ($regionDrawing) {
      const [min, max] = $regionDrawing
      ctx.save()
      ctx.beginPath()
      ctx.rect(min[0], min[1], max[0] - min[0], max[1] - min[1])
      ctx.clip()
    }

    // 分桶批渲染
    const batches = Hcvs_batch($model, big)

    for (const b of batches) {
      this.drawBatch(ctx, $model, b.prim, b.indices)
    }

    if ($regionDrawing) ctx.restore()
  }

  private drawBatch(
    $ctx: CanvasRenderingContext2D,
    $model: TsuModel,
    $prim: Prim,
    $indices: number[],
  ): void {
    const fillStr = ($packed: number) => Hm_rgbaStr($packed)

    for (const i of $indices) {

      const x = $model.x[i]
      const y = $model.y[i]
      const w = $model.w[i]
      const h = $model.h[i]
      const fill = $model.fill[i]
      const t = $model.anim[i]   // 生长比例（按锚点解读）

      $ctx.fillStyle = fillStr(fill)
      $ctx.strokeStyle = fillStr(fill)

      // 锁定态 — hover/click 描边加粗
      const isHover = $model.hoverSlots.has(i)
      const isLocked = isHover || $model.clickSlots.has(i)
      const strokeStr = Hm_rgbaStr(Hm_palette.stroke)

      switch ($prim) {
        case P.Rect: {
          // anim 底部锚点生长
          const gh = h * t
          let _dx = x, _dy = y + (h - gh), _dw = w, _dh = gh
          // hover 底部中心缩放
          if (isHover) {
            const scale = HOVER_SCALE
            _dw = gh > 0 ? w * scale : w
            _dh = gh * scale
            _dx = x - (_dw - w) / 2          // 中心 x 不变
            _dy = y + (h - gh) - (_dh - gh)  // 底部对齐
          }

          $ctx.fillStyle = fillStr(Hm_alphaFill(fill, 'rect'))   // 半透明填充
          $ctx.fillRect(_dx, _dy, _dw, _dh)
          $ctx.fillStyle = fillStr(fill)
          $ctx.strokeStyle = fillStr(fill)
          if (isLocked) {
            $ctx.lineWidth = STROKE_LOCKED
            $ctx.strokeStyle = strokeStr
            $ctx.strokeRect(_dx, _dy, _dw, _dh)
            $ctx.strokeStyle = fillStr(fill)
          }
          break
        }
        case P.Circle: {
          // aux[0] = r（Shapes.circle 写入）；anim 半径生长 + hover 缩放
          let _r = $model.aux[i * GEO_SLOTS_EACH_ELEM] * t
          if (_r <= 0) continue   // 未定型跳过本元素（continue 不跳出分桶）
          if (isHover) _r *= HOVER_SCALE
          $ctx.beginPath()
          $ctx.arc(x, y, _r, 0, TAU)
          // 原色直绘 — 实心圆语义（与 Line/Curve 描边原语一致，消 radar α=40 默认降透明）
          $ctx.fillStyle = fillStr(fill)
          $ctx.fill()
          if (isLocked) {
            $ctx.lineWidth = STROKE_LOCKED
            $ctx.strokeStyle = strokeStr
            $ctx.stroke()
          }
          break
        }

        case P.Line: {
          // w/h = Δ 偏移；零长度跳过；anim 起点锚点生长
          if (w === 0 && h === 0) break
          $ctx.lineCap = 'round'
          $ctx.lineWidth = isLocked ? STROKE_LOCKED : STROKE_NORMAL
          if (isLocked) $ctx.strokeStyle = strokeStr
          $ctx.beginPath()
          $ctx.moveTo(x, y)
          $ctx.lineTo(x + w * t, y + h * t)
          $ctx.stroke()
          if (isLocked) $ctx.strokeStyle = fillStr(fill)
          break
        }

        case P.Arc: {
          // aux[0]=r, aux[1]=startAng, aux[2]=endAng
          const a = i * GEO_SLOTS_EACH_ELEM
          // anim 扫描生长 + hover 半径缩放；±ARC_GAP_EPS 消浮点间隙
          let _r = $model.aux[a] * t
          if (isHover) _r *= HOVER_SCALE
          const startAng = $model.aux[a + 1] - ARC_GAP_EPS
          const endAng = $model.aux[a + 1] + ($model.aux[a + 2] - $model.aux[a + 1]) * t + ARC_GAP_EPS
          $ctx.beginPath()
          $ctx.moveTo(x, y)
          $ctx.arc(x, y, _r, startAng, endAng)
          $ctx.closePath()
          $ctx.fillStyle = fillStr(Hm_alphaFill(fill, 'pie'))
          $ctx.fill()
          $ctx.fillStyle = fillStr(fill)
          if (isLocked) {
            $ctx.lineWidth = STROKE_LOCKED
            $ctx.strokeStyle = strokeStr
            $ctx.stroke()
          }
          break
        }

        case P.Text: {
          $ctx.font = `${h > 0 ? h : TEXT_DEFAULT_SIZE}px sans-serif`
          $ctx.textBaseline = 'top'
          $ctx.fillText(String($model.value[i]), x, y)
          break
        }
        case P.Curve: {
          // 贝塞尔：Δ 偏移；零长度跳过；anim 起点锚点生长
          if (w === 0 && h === 0) break
          const gw = w * t
          const gh = h * t
          const a = i * GEO_SLOTS_EACH_ELEM
          const bend = $model.aux[a + 2] || 1   // 弯曲方向符号
          $ctx.lineCap = 'round'
          $ctx.lineWidth = isLocked ? STROKE_LOCKED : STROKE_NORMAL
          if (isLocked) $ctx.strokeStyle = strokeStr
          $ctx.beginPath()
          $ctx.moveTo(x, y)
          // 控制点 = 中点 + 法向 (-gh, gw) × ratio × bend
          const cpx = x + gw / 2 - gh * CURVE_NORMAL_RATIO * bend
          const cpy = y + gh / 2 + gw * CURVE_NORMAL_RATIO * bend
          $ctx.quadraticCurveTo(cpx, cpy, x + gw, y + gh)
          $ctx.stroke()
          if (isLocked) $ctx.strokeStyle = fillStr(fill)
          break
        }

        case P.Triangle: {
          // 三顶点：V_d(x,y) / V_{d+1}(x+w,y+h) / C(x+aux0,y+aux1)
          const a = i * GEO_SLOTS_EACH_ELEM
          const ax = $model.aux[a]
          const ay = $model.aux[a + 1]
          // anim 圆心锚点生长
          const cx = x + ax
          const cy = y + ay
          let _vx = cx + (x - cx) * t
          let _vy = cy + (y - cy) * t
          let _wx = cx + (x + w - cx) * t
          let _wy = cy + (y + h - cy) * t
          // hover 径向外凸
          if (isHover) {
            const scale = HOVER_SCALE
            _vx = cx + (x - cx) * t * scale
            _vy = cy + (y - cy) * t * scale
            _wx = cx + (x + w - cx) * t * scale
            _wy = cy + (y + h - cy) * t * scale
          }

          $ctx.beginPath()
          $ctx.moveTo(_vx, _vy)
          $ctx.lineTo(_wx, _wy)
          $ctx.lineTo(cx, cy)
          $ctx.closePath()
          $ctx.fillStyle = fillStr(Hm_alphaFill(fill))
          $ctx.fill()
          // 只描外边 V_d→V_{d+1}
          $ctx.lineWidth = isLocked ? STROKE_LOCKED : STROKE_NORMAL
          $ctx.strokeStyle = fillStr(fill)
          $ctx.beginPath()
          $ctx.moveTo(_vx, _vy)
          $ctx.lineTo(_wx, _wy)
          $ctx.stroke()
          if (isLocked) {
            $ctx.lineWidth = STROKE_LOCKED
            $ctx.strokeStyle = strokeStr
            $ctx.beginPath()
            $ctx.moveTo(_vx, _vy)
            $ctx.lineTo(_wx, _wy)
            $ctx.stroke()
          }
          break
        }
      }
    }
  }
}

// —— 工厂：后端 + 成对相机（同源产出防漂移：渲染矩阵与命中射线出同一实现）——
// '2d'→Canvas2D+恒等相机；'3d'→WebGPU3D+相机，初始化失败回退 Canvas2D+恒等
export async function createRenderer(
  $canvas: HTMLCanvasElement, $mode: RenderMode = '2d',
): Promise<{ renderer: Renderer; camera: CoordMapper }> {
  if ($mode === '3d') {
    const g3d = new WebGPU3D()
    if (await g3d.init($canvas)) return { renderer: g3d, camera: new CoordMapper3D() }
    console.warn('[tsukiyo] 3D 渲染不可用，回退 Canvas2D')
  }
  const c2d = new Canvas2D()
  c2d.init($canvas)
  return { renderer: c2d, camera: new CoordMapper2D() }
}
