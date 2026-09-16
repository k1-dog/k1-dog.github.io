/**
 * render — 渲染器（纯绘制层，不读写 dirty/anim/hasAnim）
 *
 * 参考 SC2：按原语类型分桶批渲染（rect 一起画、line 一起画）
 * 减少 GPU 状态切换。脏区域裁剪只重绘变化的区域
 *
 * 动画职责由 layering 统一管理：
 *   - layering.task() 末尾推进 anim + 设 hasAnim + 标 dirty
 *   - drawBatch 只读 anim 按原语锚点缩放几何（Rect底部/Arc扫描/Line起点/Triangle圆心）
 *   - coord/paths 只写目标几何，不感知 anim
 *
 * flush(model, regionDrawing, regionBigDrawing):
 *   regionDrawing = 本帧重绘域（脏元素 AABB 合并矩形）→ clearRect + clip + drawBatch
 *   regionBigDrawing = 重绘域内元素大名单（脏元素 ∪ 域内相交非脏元素，layering 产出）
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

  /** 第5参 clipMatrix — 3D 相机矩阵；Canvas2D 图表坐标即屏幕坐标，恒忽略
   *  视线帧（拖拽/缩放后首帧）的清除与全量重绘由 layering 设备域全清 + 全元素标脏保证 */
  flush($model: TsuModel, $regionDrawing: Bounds | null, $regionBigDrawing?: number[], $_clipMatrix?: Float32Array | null): void {
    const ctx = this.ctx

    if (!ctx || !this.canvas) return
    // 重绘元素大名单为空时无元素需要绘制
    const big = $regionBigDrawing ?? []
    if (big.length === 0) return

    const w = this.canvas.width
    const h = this.canvas.height

    // 清除重绘域或全屏
    if ($regionDrawing) {
      const [min, max] = $regionDrawing
      ctx.clearRect(min[0], min[1], max[0] - min[0], max[1] - min[1])
    } else {
      ctx.clearRect(0, 0, w, h)
    }

    // 裁剪到重绘域
    if ($regionDrawing) {
      const [min, max] = $regionDrawing
      ctx.save()
      ctx.beginPath()
      ctx.rect(min[0], min[1], max[0] - min[0], max[1] - min[1])
      ctx.clip()
    }

    // 按原语类型分桶批渲染 — Hcvs_batch 只遍历重绘元素大名单并按 type 分组
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
      // anim 生长比例 — 统一在 render 应用动画缩放（各原语按锚点解读）
      const t = $model.anim[i]

      $ctx.fillStyle = fillStr(fill)
      $ctx.strokeStyle = fillStr(fill)

      // 锁定状态 — hover 或 click 时描边加粗凸显当前操作图形（派生态 — 绘制时从 slots 合成）
      const isHover = $model.hoverSlots.has(i)
      const isLocked = isHover || $model.clickSlots.has(i)
      const strokeStr = Hm_rgbaStr(Hm_palette.stroke)

      switch ($prim) {
        case P.Rect: {
          // anim 底部锚点生长 — h 从 0 向上生长，y 补偿保持底部对齐
          const gh = h * t
          let _dx = x, _dy = y + (h - gh), _dw = w, _dh = gh
          // hover 即时缩放 — HOVER_SCALE，底部中心锚点（在 anim 生长后的几何上缩放）
          if (isHover) {
            const scale = HOVER_SCALE
            _dw = gh > 0 ? w * scale : w
            _dh = gh * scale
            _dx = x - (_dw - w) / 2   // 中心 x 不变
            _dy = y + (h - gh) - (_dh - gh)  // 底部对齐（基于 anim 后的底部）
          }

          // 半透明填充 — 统一 alpha=40，与 Triangle/雷达图视觉一致
          $ctx.fillStyle = fillStr(Hm_alphaFill(fill, 'rect'))
          $ctx.fillRect(_dx, _dy, _dw, _dh)
          // 恢复 fillStyle 供后续描边使用
          $ctx.fillStyle = fillStr(fill)
          $ctx.strokeStyle = fillStr(fill)
          // 锁定描边 — 参考 AntV/Chart.js hover 边框高亮
          if (isLocked) {
            $ctx.lineWidth = STROKE_LOCKED
            $ctx.strokeStyle = strokeStr
            $ctx.strokeRect(_dx, _dy, _dw, _dh)
            $ctx.strokeStyle = fillStr(fill)
          }
          break
        }
        case P.Circle: {
          let _r = w / 2
          // hover 即时缩放 — 半径 × HOVER_SCALE
          if (isHover) _r *= HOVER_SCALE
          $ctx.beginPath()
          $ctx.arc(x, y, _r, 0, TAU)
          $ctx.fillStyle = fillStr(Hm_alphaFill(fill))
          $ctx.fill()
          $ctx.fillStyle = fillStr(fill)
          if (isLocked) {
            $ctx.lineWidth = STROKE_LOCKED
            $ctx.strokeStyle = strokeStr
            $ctx.stroke()
          }
          break
        }

        case P.Line: {
          // w/h = Δx/Δy（目标偏移，由 pathsTask 回写）
          // 零长度线段不绘制（最后一个点没有下一个点）
          if (w === 0 && h === 0) break
          // anim 起点锚点生长 — Δ 从起点向外延伸
          // lineCap round — 消除顶点连接处的缝隙/交叉撕裂
          // 锁定视觉 — 描边原语无填充体，整线换高亮色 + 加粗（与其他原语 strokeStr 锁定语义对称）
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
          // aux[0]=半径, aux[1]=startAng, aux[2]=endAng
          // (x,y) = 圆心（由 polar coord 设置）
          const a = i * GEO_SLOTS_EACH_ELEM
          // anim 扫描生长 — 半径从 0 生长 + 角度从 startAng 扫描到 endAng
          // hover 即时缩放 — 半径 × HOVER_SCALE
          let _r = $model.aux[a] * t
          if (isHover) _r *= HOVER_SCALE
          // ±ARC_GAP_EPS 重叠消除相邻扇形浮点间隙
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
          // 贝塞尔曲线 — w/h = Δx/Δy（目标偏移，由 pathsTask 回写）
          // 零长度跳过（末点）
          if (w === 0 && h === 0) break
          // anim 起点锚点生长 — Δ 从起点向外延伸
          const gw = w * t
          const gh = h * t
          // aux[2] = 弯曲方向符号（+1/-1），0 时默认 +1（兼容非 sineHook 场景）
          const a = i * GEO_SLOTS_EACH_ELEM
          const bend = $model.aux[a + 2] || 1
          // 锁定视觉 — 描边原语无填充体，整线换高亮色 + 加粗（与其他原语 strokeStr 锁定语义对称）
          $ctx.lineCap = 'round'
          $ctx.lineWidth = isLocked ? STROKE_LOCKED : STROKE_NORMAL
          if (isLocked) $ctx.strokeStyle = strokeStr
          $ctx.beginPath()
          $ctx.moveTo(x, y)
          // 控制点 = 中点 + 法向量 (-gh, gw) × CURVE_NORMAL_RATIO × bend
          const cpx = x + gw / 2 - gh * CURVE_NORMAL_RATIO * bend
          const cpy = y + gh / 2 + gw * CURVE_NORMAL_RATIO * bend
          $ctx.quadraticCurveTo(cpx, cpy, x + gw, y + gh)
          $ctx.stroke()
          if (isLocked) $ctx.strokeStyle = fillStr(fill)
          break
        }

        case P.Triangle: {
          // 三角扇切片 — 三顶点：V_d(x,y) / V_{d+1}(x+w,y+h) / C(x+aux0,y+aux1)
          const a = i * GEO_SLOTS_EACH_ELEM
          const ax = $model.aux[a]
          const ay = $model.aux[a + 1]
          // anim 圆心锚点生长 — V_d 和 V_{d+1} 从圆心 C 向外展开
          const cx = x + ax
          const cy = y + ay
          let _vx = cx + (x - cx) * t
          let _vy = cy + (y - cy) * t
          let _wx = cx + (x + w - cx) * t
          let _wy = cy + (y + h - cy) * t
          // hover 径向外凸 — 三顶点关于 C 缩放 HOVER_SCALE（exploded wedge 高亮）
          if (isHover) {
            const scale = HOVER_SCALE
            _vx = cx + (x - cx) * t * scale
            _vy = cy + (y - cy) * t * scale
            _wx = cx + (x + w - cx) * t * scale
            _wy = cy + (y + h - cy) * t * scale
          }

          // fill — 统一 alpha 降级（与其他原语一致）
          $ctx.beginPath()
          $ctx.moveTo(_vx, _vy)
          $ctx.lineTo(_wx, _wy)
          $ctx.lineTo(cx, cy)
          $ctx.closePath()
          $ctx.fillStyle = fillStr(Hm_alphaFill(fill))
          $ctx.fill()
          // 只描外边 V_d→V_{d+1}（不画两条辐条 → 干净多边形外廓）
          $ctx.lineWidth = isLocked ? STROKE_LOCKED : STROKE_NORMAL
          $ctx.strokeStyle = fillStr(fill)
          $ctx.beginPath()
          $ctx.moveTo(_vx, _vy)
          $ctx.lineTo(_wx, _wy)
          $ctx.stroke()
          // 锁定描边 — 高亮当前切片外边
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

// —— 工厂：按 mode 选择后端 + 成对取景相机 ——
// '2d'（默认）→ Canvas2D + CoordMapper2D（恒等），支持全部原语
// '3d' → WebGPU3D + CoordMapper3D（相机）；WebGPU 不可用/初始化失败 → 优雅回退 Canvas2D + 恒等相机
// 后端与相机同源产出 — 结构性防漂移（渲染矩阵与命中射线永远出自同一实现）
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
