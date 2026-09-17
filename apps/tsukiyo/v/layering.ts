/**
 * layering — 视觉布局执行流（Schedulable，after paths）。
 * 静态层：gridCanvas 挂 dataCanvas 下，gridDirty 守卫重绘（coordCtx 本轮最新刻度不滞后），不参与每帧重绘。
 * 动态层五阶段：① 取景+基准重建 ② 脏元素处理（drainDirty + AABB 扩张 + spatial 更新，被剔除重入队）
 * ③ 合并脏区域 ④ 大名单（域内相交 ∧ 视线内，含联动非脏）⑤ anim 推进。
 * 派生注入：视口/locator/coordCtx 全 getter 回调（读取即最新）。
 */
import type { Schedulable, CoordRule, CoordCtx, Bounds } from '../yomi'
import type { TsuModel } from '../m/model'
import type { Grid } from '../middleware/spatial'
import type { Dirty } from '../middleware/dirty'
import type { Scheduler } from '../middleware/scheduler'
import { radarRadius } from './coord'
import { Hm_unionBounds } from '../helper/maths'
import { Hcvs_retina } from '../helper/canvas'
import {
  ARC_START_ANGLE, DIRTY_PAD_RATIO, DIRTY_PAD_PX, GRID_STYLE,
  LABEL_AXIS_THRESHOLD, POLAR_GRID_RAYS, RADAR_GRID_LAYERS, RADAR_LABEL_OFFSET,
  TAU, Y_AXIS_TICKS,
} from '../helper/const'

/** 派生依赖 — getter 注入（读取即最新） */
export interface LayeringDeps {
  viewWidth: () => number
  viewHeight: () => number
  locator: () => CoordRule | null
  coordCtx: () => CoordCtx | null
}

export class Layering implements Schedulable {
  readonly taskName = 'layering'

  private model: TsuModel
  private spatial: Grid
  private dirty: Dirty
  private scheduler: Scheduler
  private canvas: HTMLCanvasElement
  private deps: LayeringDeps

  /** 网格重绘信号 — task 首行消费（调度信号，非 SoA 数据） */
  private gridDirty = true
  private gridCanvas: HTMLCanvasElement | null = null
  private bound = false

  /** 本帧重绘域 — 脏 AABB 合并单一边界（render clearRect+clip） */
  regionDrawing: Bounds | null = null

  /** 重绘大名单 — 脏 ∪ 域内相交非脏（联动补绘） */
  regionBigDrawing: number[] = []

  private aabbBuf: Bounds = [[0, 0], [0, 0]]   // aabbInto 复用缓冲（零分配）

  constructor(
    $model: TsuModel,
    $spatial: Grid,
    $dirty: Dirty,
    $scheduler: Scheduler,
    $canvas: HTMLCanvasElement,
    $deps: LayeringDeps,
  ) {
    this.model = $model
    this.spatial = $spatial
    this.dirty = $dirty
    this.scheduler = $scheduler
    this.canvas = $canvas
    this.deps = $deps
  }

  // 标记网格重绘（engine 在 locator 重解析/initGrid/resize 后调用）
  markGridDirty(): void {
    this.gridDirty = true
  }

  // —— 静态层管理 ——

  // 创建静态网格层（挂 dataCanvas 下方，只 gridDirty 时绘制）
  initGrid(): void {
    const parent = this.canvas.parentElement
    if (!parent) return

    // 父容器相对定位（网格层可绝对覆盖）
    const parentStyle = getComputedStyle(parent)
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative'
    }

    this.gridCanvas = document.createElement('canvas')
    this.gridCanvas.classList.add('tsukiyo-chart__grid')
    this.canvas.style.position = 'relative'   // dataCanvas 提到网格之上
    this.canvas.style.zIndex = '1'

    parent.insertBefore(this.gridCanvas, this.canvas)
    this.markGridDirty()
  }

  // 网格背景 — grid meta 单源选择：cartesian 横竖线+刻度 / polar 同心圆+辐射线 / radar 多边形+dimY 标签
  private redrawGrid(): void {
    if (!this.gridCanvas) return

    const w = this.deps.viewWidth()
    const h = this.deps.viewHeight()
    if (w <= 0 || h <= 0) return

    // 基准合成（2D 六元网格随视线动；3D retina 跳过，网格静止）
    Hcvs_retina(this.gridCanvas, undefined, this.spatial.cameraMatrix)

    const ctx = this.gridCanvas.getContext('2d')
    if (!ctx) return

    this.wipeDevice(ctx)   // 设备域全清

    ctx.strokeStyle = GRID_STYLE.stroke
    ctx.lineWidth = GRID_STYLE.lineWidth
    ctx.fillStyle = GRID_STYLE.labelFill
    ctx.font = GRID_STYLE.labelFont
    ctx.textBaseline = 'top'

    const grid = this.deps.locator()?.grid   // grid meta 单源判定

    if (grid === 'radar') {
      const cx = w / 2
      const cy = h / 2
      const maxR = radarRadius(w, h)   // 与 coord 同源（含标签位，消 desync）
      const dimYCount = this.model.dimYMap.size || 1

      const dimYKeys = [...this.model.dimYMap.keys()]

      // 同心多边形
      for (let _layer = 1; _layer <= RADAR_GRID_LAYERS; _layer++) {
        const r = (maxR / RADAR_GRID_LAYERS) * _layer
        ctx.beginPath()
        for (let _d = 0; _d < dimYCount; _d++) {
          const ang = ARC_START_ANGLE + (_d / dimYCount) * TAU
          const px = cx + Math.cos(ang) * r
          const py = cy + Math.sin(ang) * r
          if (_d === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()
      }

      // 辐射轴 + dimY 标签
      for (let _d = 0; _d < dimYCount; _d++) {
        const ang = ARC_START_ANGLE + (_d / dimYCount) * TAU
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR)
        ctx.stroke()
        // dimY 标签 — 末端外侧角度感知对齐
        const labelR = maxR + RADAR_LABEL_OFFSET
        const lx = cx + Math.cos(ang) * labelR
        const ly = cy + Math.sin(ang) * labelR
        if (dimYKeys[_d]) {
          // cos/sin 符号选 align/baseline
          const cosA = Math.cos(ang)
          const sinA = Math.sin(ang)
          if (sinA < -LABEL_AXIS_THRESHOLD) {
            ctx.textAlign = 'center'   // 顶部
            ctx.textBaseline = 'bottom'
          } else if (sinA > LABEL_AXIS_THRESHOLD) {
            ctx.textAlign = 'center'   // 底部
            ctx.textBaseline = 'top'
          } else if (cosA < -LABEL_AXIS_THRESHOLD) {
            ctx.textAlign = 'right'    // 左侧
            ctx.textBaseline = 'middle'
          } else {
            ctx.textAlign = 'left'     // 右侧
            ctx.textBaseline = 'middle'
          }
          ctx.fillText(dimYKeys[_d], lx, ly)
        }
      }
    } else if (grid === 'polar') {
      // 极坐标 — 同心圆 + 辐射线
      const cx = w / 2
      const cy = h / 2
      const maxR = Math.min(w, h) / 2

      for (let _i = 1; _i <= RADAR_GRID_LAYERS; _i++) {
        const r = (maxR / RADAR_GRID_LAYERS) * _i
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, TAU)
        ctx.stroke()
        // 半径刻度
        ctx.fillText(`${Math.round(r)}`, cx + GRID_STYLE.yLabelOffsetX, cy - r + GRID_STYLE.yLabelOffsetY)
      }

      for (let _i = 0; _i < POLAR_GRID_RAYS; _i++) {
        const ang = (_i / POLAR_GRID_RAYS) * TAU
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR)
        ctx.stroke()
      }
    } else {
      // 笛卡尔（默认）
      const dimXCount = this.model.dimXMap.size || 1
      const colW = w / dimXCount

      // Y 轴竖线
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, h)
      ctx.stroke()

      // 竖线画列中心 + X 轴刻度
      const dimXKeys = [...this.model.dimXMap.keys()]
      for (let _i = 0; _i < dimXCount; _i++) {
        const x = _i * colW + colW / 2
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
        if (dimXKeys[_i]) {
          ctx.textAlign = 'center'
          ctx.fillText(dimXKeys[_i], x, h - GRID_STYLE.xLabelOffsetY)
        }
      }

      // 横线 + Y 轴刻度（coordCtx 本 tick 产出；null → 默认值域）
      const coordCtx = this.deps.coordCtx()
      const vMin = coordCtx ? coordCtx.valueMin : 0
      const vMax = coordCtx ? coordCtx.valueMax : 100

      for (let _i = 0; _i <= Y_AXIS_TICKS; _i++) {
        const y = (_i / Y_AXIS_TICKS) * h
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
        const tickVal = vMax - (_i / Y_AXIS_TICKS) * (vMax - vMin)
        ctx.textAlign = 'left'
        ctx.fillText(tickVal.toFixed(GRID_STYLE.yLabelDecimals), GRID_STYLE.yLabelOffsetX, y + GRID_STYLE.yLabelOffsetY)
      }
    }
  }

  // 设备域全清 — setTransform 恒等后清整个物理画布
  private wipeDevice($ctx: CanvasRenderingContext2D): void {
    $ctx.save()
    $ctx.setTransform(1, 0, 0, 1, 0, 0)
    $ctx.clearRect(0, 0, $ctx.canvas.width, $ctx.canvas.height)
    $ctx.restore()
  }

  // —— Schedulable 契约 ——
  // 幂等激活（after paths）
  bind(): void {
    if (this.bound) return
    this.bound = true
    this.scheduler.add('layering', () => this.task(), { after: ['paths'] })
  }

  // 幂等取消
  unbind(): void {
    if (!this.bound) return
    this.bound = false
    this.scheduler.remove(this.taskName)
  }

  // 五阶段流水线（见文件头）— drainDirty 唯一消费者 + region 唯一生产者
  task(): void {
    const w = this.deps.viewWidth()
    const h = this.deps.viewHeight()
    const m = this.model

    this.regionBigDrawing.length = 0
    this.regionDrawing = null

    // ① 取景（moved = 视线变了 → 基准重建）
    const moved = this.spatial.frame(m, w, h)
    if (moved) this.gridDirty = true

    // 基准重建 + dataCanvas 设备域全清（旧帧全废）
    if (this.gridDirty) {
      this.gridDirty = false
      this.redrawGrid()
      Hcvs_retina(this.canvas, undefined, this.spatial.cameraMatrix)
      const dataCtx = this.canvas.getContext('2d')
      if (dataCtx) this.wipeDevice(dataCtx)
    }

    // ② 脏元素处理
    const aabb = this.aabbBuf
    for (const i of m.drainDirty()) {
      m.aabbInto(i, aabb)
      const [min, max] = aabb

      // 视线外剔除 — 重新入队
      if (w > 0 && h > 0 && this.spatial.outOfSight(aabb, w, h)) {
        m.markDirty(i)
        continue
      }

      // padding — ratio 覆盖 hover 残影，px 覆盖描边
      const cx = (min[0] + max[0]) / 2
      const cy = (min[1] + max[1]) / 2
      const halfW = (max[0] - min[0]) / 2 * DIRTY_PAD_RATIO + DIRTY_PAD_PX
      const halfH = (max[1] - min[1]) / 2 * DIRTY_PAD_RATIO + DIRTY_PAD_PX
      this.dirty.mark([[cx - halfW, cy - halfH], [cx + halfW, cy + halfH]])

      this.spatial.update(i, aabb)   // key = SoA 槽位（src 会被多原语覆盖）
    }

    // ③ 合并脏区域
    const regions = this.dirty.consume()
    if (regions.length === 0) return
    this.regionDrawing = Hm_unionBounds(regions)
    if (!this.regionDrawing) return

    // ④ 大名单 — 域相交 ∧ 视线内（含联动非脏）
    const [rMin, rMax] = this.regionDrawing
    for (let _i = 0; _i < m.count; _i++) {
      m.aabbInto(_i, aabb)
      const [min, max] = aabb

      if (w > 0 && h > 0 && this.spatial.outOfSight(aabb, w, h)) continue
      if (max[0] < rMin[0] || min[0] > rMax[0] || max[1] < rMin[1] || min[1] > rMax[1]) continue

      this.regionBigDrawing.push(_i)
    }

    // ⑤ anim 推进（anim<1 标脏 → 下一帧继续）
    m.stepAnim(this.regionBigDrawing)
  }
}
