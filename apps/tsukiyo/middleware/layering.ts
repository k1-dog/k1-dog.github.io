/**
 * layering — 视觉布局执行流: 静态层管理 + 脏区域收集 + 空间索引更新 + 视椎剔除
 *
 * 实现 Schedulable 契约 — 由 engine 创建并 bind 到 scheduler
 *
 * 职责 <从 engine 抽取，engine 不再内联任何布局/绘制逻辑> :
 *
 * 视觉基准重建 [gridDirty 守卫] — retina 尺寸基准 × 视线仿射一步合成:
 *   双 canvas（dataCanvas + gridCanvas）同一合成入口 Hcvs_retina(canvas, dpr, view)
 *   重绘时机 — task ① gridDirty 守卫（tick 内 after paths）:
 *   数据/尺寸变化（engine 置位）或取景变了（spatial.frame 返回 moved，视线交互后）
 *
 * 静态层 [initGrid / redrawGrid] — 一次性创建 + gridDirty 守卫重绘:
 *   1. 创建 gridCanvas DOM 元素, 挂在 dataCanvas 下方 [z-index:0]
 *   2. 按坐标系类型绘制网格背景 [grid meta: cartesian 横竖线 / polar 同心圆 / radar 多边形]
 *   3. 网格不参与每帧重绘 → 不闪烁、不残影
 *   4. 此刻 coordCtx 已是本轮最新 → Y 轴刻度永不滞后（结构上消灭"用上一轮值域画网格"）
 *
 * 动态层 <task，每帧 tick 内 after paths> :
 *   ① 取景 + 视觉基准重建 — spatial.frame（moved → gridDirty）+ 双 canvas retina 合成
 *   ② 脏元素处理 — drainDirty 消费 + AABB 扩张 + spatial 更新（被剔除元素重新入队）
 *   ③ 合并脏区域 — dirty.mark 收集 [供 draw task 合并 + 局部重绘]
 *   ④ 视线之外剔除 — outOfSight（2D 正仿射屏幕域换算 / 3D 保守放行）
 *   ⑤ anim 推进 — anim 唯一写入点
 *
 * 派生注入: 视口尺寸/locator/coordCtx 全部 getter 回调注入（读取即最新，零同步写）
 */
import type { Schedulable, CoordRule, CoordCtx, Bounds } from '../yomi'
import type { TsuModel } from '../m/model'
import type { Grid } from './spatial'
import type { Dirty } from './dirty'
import type { Scheduler } from './scheduler'
import { radarRadius } from '../v/coord'
import { Hm_unionBounds } from '../helper/maths'
import { Hcvs_retina } from '../helper/canvas'
import {
  ANIM_STEP, ARC_START_ANGLE, DIRTY_PAD_RATIO, DIRTY_PAD_PX, GRID_STYLE,
  LABEL_AXIS_THRESHOLD, POLAR_GRID_RAYS, RADAR_GRID_LAYERS, RADAR_LABEL_OFFSET,
  TAU, Y_AXIS_TICKS,
} from '../helper/const'

/** 派生依赖 — getter 回调注入（读取即最新，零双点同步写） */
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

  /** 网格重绘信号 — initGrid/数据/尺寸变化时置位，task 首行消费（调度信号，非 SoA 数据） */
  private gridDirty = true
  private gridCanvas: HTMLCanvasElement | null = null
  private bound = false

  /** 本帧重绘域 — 脏元素 AABB 合并后的单一边界（render clearRect + clip） */
  regionDrawing: Bounds | null = null

  /** 本帧重绘元素大名单 — 重绘域内脏元素 ∪ 域内相交非脏元素（联动补绘；render 直接消费） */
  regionBigDrawing: number[] = []

  // aabbInto 复用缓冲（task 热路径零分配）
  private aabbBuf: Bounds = [[0, 0], [0, 0]]

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

  /** 标记网格重绘（engine input task 在 locator 重解析后调用；initGrid/resize 同） */
  markGridDirty(): void {
    this.gridDirty = true
  }

  // —— 静态层管理 ——

  /**
   * 创建静态网格背景层 — 双 canvas 分离。
   * gridCanvas 放在 dataCanvas 下方（z-index 低），只在 gridDirty 时绘制。
   * 数据层每帧由 flush 重绘，不碰网格层 → 网格不闪烁、不残影。
   */
  initGrid(): void {
    const parent = this.canvas.parentElement
    if (!parent) return

    // 确保父容器是相对定位，网格层可绝对定位覆盖
    const parentStyle = getComputedStyle(parent)
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative'
    }

    this.gridCanvas = document.createElement('canvas')
    this.gridCanvas.classList.add('tsukiyo-chart__grid')
    // 数据 canvas 提升到网格层之上
    this.canvas.style.position = 'relative'
    this.canvas.style.zIndex = '1'

    parent.insertBefore(this.gridCanvas, this.canvas)
    this.markGridDirty()
  }

  /**
   * 绘制网格背景 — 按 locator.grid meta 单源选择网格样式族。
   * cartesian: 横竖网格线 + Y轴刻度(value) + X轴刻度(dimX标签)
   * polar: 同心圆 + 辐射线
   * radar: 扇区背景 + 同心多边形 + 辐射轴线 + dimY 标签
   * 只在 gridDirty 时由 task 首行调用（tick 内 after paths → coordCtx 本轮最新）。
   * 无 GAP 偏移 — 网格线画到画布边缘，与 coord 坐标系完全一致。
   */
  private redrawGrid(): void {
    if (!this.gridCanvas) return

    const w = this.deps.viewWidth()
    const h = this.deps.viewHeight()
    if (w <= 0 || h <= 0) return

    // 视觉基准合成 — 尺寸基准 × 视线仿射（2D 六元 → 网格随视线平移缩放；
    // 3D 16 元 → retina 自动跳过，网格保持纯基准静止，与 3D 取景语义对称）
    Hcvs_retina(this.gridCanvas, undefined, this.spatial.cameraMatrix)

    const ctx = this.gridCanvas.getContext('2d')
    if (!ctx) return

    // 设备域全清 — 旧帧像素活在旧变换位置，图表域 clearRect 够不着 → 残影根治
    this.wipeDevice(ctx)

    ctx.strokeStyle = GRID_STYLE.stroke
    ctx.lineWidth = GRID_STYLE.lineWidth
    ctx.fillStyle = GRID_STYLE.labelFill
    ctx.font = GRID_STYLE.labelFont
    ctx.textBaseline = 'top'

    // grid meta 单源判定 — locator（解析后的 CoordRule）自声明网格族
    const grid = this.deps.locator()?.grid

    if (grid === 'radar') {
      // 雷达图：扇区背景 + 同心多边形 + 辐射轴线 + dimY 标签
      const cx = w / 2
      const cy = h / 2
      // 雷达半径与 coord 同源（含标签位）— 消除 grid/coord desync，标签落在画布内
      const maxR = radarRadius(w, h)
      const dimYCount = this.model.dimYMap.size || 1

      const dimYKeys = [...this.model.dimYMap.keys()]

      // 同心多边形（刻度参考线）
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
        // dimY 标签 — 在轴线末端外侧，角度感知对齐（消除顶部重叠/左右偏移）
        const labelR = maxR + RADAR_LABEL_OFFSET
        const lx = cx + Math.cos(ang) * labelR
        const ly = cy + Math.sin(ang) * labelR
        if (dimYKeys[_d]) {
          // 用 cos/sin 符号选 align/baseline — 阈值区分轴向 vs 斜向
          const cosA = Math.cos(ang)
          const sinA = Math.sin(ang)
          if (sinA < -LABEL_AXIS_THRESHOLD) {
            // 顶部 — 文字在轴上方
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
          } else if (sinA > LABEL_AXIS_THRESHOLD) {
            // 底部 — 文字在轴下方
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
          } else if (cosA < -LABEL_AXIS_THRESHOLD) {
            // 左侧 — 文字在轴左侧
            ctx.textAlign = 'right'
            ctx.textBaseline = 'middle'
          } else {
            // 右侧 — 文字在轴右侧
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
          }
          ctx.fillText(dimYKeys[_d], lx, ly)
        }
      }
    } else if (grid === 'polar') {
      // 极坐标：同心圆 + 辐射线
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
      // 笛卡尔（默认）：横竖网格线 + 刻度
      const dimXCount = this.model.dimXMap.size || 1
      const colW = w / dimXCount

      // Y 轴竖线（左边界）— 与底部横线交叉形成原点角，Y轴标签挂在此线上
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, h)
      ctx.stroke()

      // 竖线 + X轴刻度（dimX 标签）— 竖线画在列中心，与柱子/折线点/标签对齐
      const dimXKeys = [...this.model.dimXMap.keys()]
      for (let _i = 0; _i < dimXCount; _i++) {
        const x = _i * colW + colW / 2
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
        // X轴标签 — 在竖线正下方底部
        if (dimXKeys[_i]) {
          ctx.textAlign = 'center'
          ctx.fillText(dimXKeys[_i], x, h - GRID_STYLE.xLabelOffsetY)
        }
      }

      // 横线 + Y轴刻度（value 归一化）
      // 派生读取 coordCtx（coord task 本 tick 刚产出，永不滞后）；
      // null = coord 尚未跑过（空模型）→ 用默认值域
      const coordCtx = this.deps.coordCtx()
      const vMin = coordCtx ? coordCtx.valueMin : 0
      const vMax = coordCtx ? coordCtx.valueMax : 100

      for (let _i = 0; _i <= Y_AXIS_TICKS; _i++) {
        const y = (_i / Y_AXIS_TICKS) * h
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
        // Y轴标签 — 在左边界线右侧，value 从高到低
        const tickVal = vMax - (_i / Y_AXIS_TICKS) * (vMax - vMin)
        ctx.textAlign = 'left'
        ctx.fillText(tickVal.toFixed(GRID_STYLE.yLabelDecimals), GRID_STYLE.yLabelOffsetX, y + GRID_STYLE.yLabelOffsetY)
      }
    }
  }

  /** 设备域全清 — 脱离一切变换清除整个物理画布（残影根治：旧帧像素活在旧变换位置，图表域清除够不着） */
  private wipeDevice($ctx: CanvasRenderingContext2D): void {
    $ctx.save()
    $ctx.setTransform(1, 0, 0, 1, 0, 0)
    $ctx.clearRect(0, 0, $ctx.canvas.width, $ctx.canvas.height)
    $ctx.restore()
  }

  // —— Schedulable 契约 ——
  /** 幂等激活 — 注册 scheduler task（after paths） */
  bind(): void {
    if (this.bound) return
    this.bound = true
    this.scheduler.add('layering', () => this.task(), { after: ['paths'] })
  }

  /** 幂等取消 — 从 scheduler 移除 task */
  unbind(): void {
    if (!this.bound) return
    this.bound = false
    this.scheduler.remove(this.taskName)
  }

  /**
   * tick 内调用 — drainDirty 的唯一消费者 + inView/region 的唯一生产者
   *
   * 五阶段流水线:
   *   ① 取景 + 视觉基准重建 — spatial.frame 每帧无条件重算（moved → gridDirty）；
   *      gridDirty 守卫：redrawGrid（网格层）+ dataCanvas retina 合成 + 设备域全清（同一入口同一视线）
   *      此刻 coordCtx 已是本轮最新（结构上消灭刻度滞后）
   *   ② 脏元素处理 — drainDirty 消费脏表 + AABB 扩张 + spatial 更新
   *      （视线之外剔除的元素重新入队 — 脏表即队列，剔除=延迟处理，回视线时恢复）
   *   ③ 合并脏区域 — dirty.consume() → 存入 regionDrawing
   *   ④ 收集 regionBigDrawing — 与 regionDrawing 相交 ∧ 视线内的所有元素（含联动非脏元素）
   *   ⑤ anim 推进 — anim<1 的元素标脏（下一帧继续推进）
   */
  task(): void {
    const w = this.deps.viewWidth()
    const h = this.deps.viewHeight()
    const m = this.model

    this.regionBigDrawing.length = 0
    this.regionDrawing = null

    // ① 取景 — 每帧无条件重算（渲染矩阵与命中射线同源；不受脏守卫 — 相机随模型几何而非脏动；
    //    若后续帧 return，取景仍已按最新模型就绪；interact 在 layering 前执行 → 消费上一帧
    //    取景，与 spatial 索引同一滞后节奏）
    //    moved = 视线变了（滚轮/拖拽后）→ 网格与 dataCanvas 基准同步重建
    const moved = this.spatial.frame(m, w, h)
    if (moved) this.gridDirty = true

    // 视觉基准重建 — 双 canvas 同一合成入口（dataCanvas 此刻合成，网格层在 redrawGrid 内合成）
    // + dataCanvas 设备域全清（视线变了 → 旧帧像素全废，flush 将全量重绘）
    if (this.gridDirty) {
      this.gridDirty = false
      this.redrawGrid()
      Hcvs_retina(this.canvas, undefined, this.spatial.cameraMatrix)
      const dataCtx = this.canvas.getContext('2d')
      if (dataCtx) this.wipeDevice(dataCtx)
    }

    // ② 脏元素处理 — drainDirty 唯一消费者（markDirty/clearDirty 协议）
    const aabb = this.aabbBuf
    for (const i of m.drainDirty()) {
      m.aabbInto(i, aabb)
      const [min, max] = aabb

      // 视线之外剔除 — 重新入队（回视线时恢复处理）
      if (w > 0 && h > 0 && this.spatial.outOfSight(aabb, w, h)) {
        m.markDirty(i)
        continue
      }

      // 统一 padding — 所有脏元素扩展 ratio + px
      // ratio 覆盖 hover 缩放残影，px 覆盖描边
      const cx = (min[0] + max[0]) / 2
      const cy = (min[1] + max[1]) / 2
      const halfW = (max[0] - min[0]) / 2 * DIRTY_PAD_RATIO + DIRTY_PAD_PX
      const halfH = (max[1] - min[1]) / 2 * DIRTY_PAD_RATIO + DIRTY_PAD_PX
      this.dirty.mark([[cx - halfW, cy - halfH], [cx + halfW, cy + halfH]])

      // spatial 更新 — 用 SoA 槽位索引做 key（每个可视原语独立可碰撞）
      // 不能用 src（原始元素索引）— pointFn 返回多原语时多个槽位共享同一 src 会互相覆盖
      this.spatial.update(i, aabb)
    }

    // ③ 合并脏区域 — dirty 唯一消费点，存入 regionDrawing 供 render clip
    const regions = this.dirty.consume()
    if (regions.length === 0) return
    this.regionDrawing = Hm_unionBounds(regions)
    if (!this.regionDrawing) return

    // ④ 收集 regionBigDrawing — 与重绘域相交 ∧ 视线内的所有元素
    // 重绘域 clearRect 后区域内所有元素都需重绘（含联动的非脏元素）
    const [rMin, rMax] = this.regionDrawing
    for (let _i = 0; _i < m.count; _i++) {
      m.aabbInto(_i, aabb)
      const [min, max] = aabb

      // 视线之外剔除
      if (w > 0 && h > 0 && this.spatial.outOfSight(aabb, w, h)) continue

      // 重绘域相交检测 — 不相交的元素不在重绘域内，无需重绘
      if (max[0] < rMin[0] || min[0] > rMax[0] || max[1] < rMin[1] || min[1] > rMax[1]) continue

      this.regionBigDrawing.push(_i)
    }

    // ⑤ anim 推进 — anim 唯一写入点
    // anim<1 的元素标脏 → 下一帧 ② 阶段会收集为脏区域 → 动画持续推进
    for (const i of this.regionBigDrawing) {
      if (m.anim[i] < 1) {
        m.anim[i] = Math.min(1, m.anim[i] + ANIM_STEP)
        m.markDirty(i)
      }
    }
  }
}
