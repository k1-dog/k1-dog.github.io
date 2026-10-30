/**
 * v/grid — 缺省网格背景：自绘层（纯绘制——零 canvas / 视口设置）
 * 网格族来自 locator；未知族不画
 */
import type { ITsukiyoLocator } from '../yomi'
import type { TsuModel } from '../m/model'
import { radarR } from './coord'
import {
  ARC_START_ANGLE, AXIS_TICKS, GRID_STYLE, LABEL_AXIS_THRESHOLD,
  POLAR_GRID_RAYS, RADAR_GRID_LAYERS, RADAR_LABEL_OFFSET, TAU,
} from '../helper/const'

type GridDrawer = ($ctx: CanvasRenderingContext2D, w: number, h: number, model: TsuModel, locator: ITsukiyoLocator) => void

/** 网格层绘制 — 样式设置 + 族分发 */
export function drawGrid(
  $ctx: CanvasRenderingContext2D, $w: number, $h: number,
  $model: TsuModel, $locator: ITsukiyoLocator | null,
): void {
  if (!$locator) return
  // 缺省不画：坐标系是声明、不是默认；Bar 简写自带 grid:'cartesian'
  const drawer = $locator.grid ? GRID[$locator.grid] : undefined
  if (!drawer) return
  $ctx.strokeStyle = GRID_STYLE.stroke
  $ctx.lineWidth = GRID_STYLE.lineWidth
  $ctx.fillStyle = GRID_STYLE.labelFill
  $ctx.font = GRID_STYLE.labelFont
  $ctx.textBaseline = 'top'
  drawer($ctx, $w, $h, $model, $locator)
}

// cartesian — Y 刻度（值域）+ 列中心 / X 刻度（数值域）
function cartesian($ctx: CanvasRenderingContext2D, $w: number, $h: number, $model: TsuModel, $locator: ITsukiyoLocator): void {
  const ctx = $ctx
  const c = $locator.ctx ?? null

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, $h)
  ctx.stroke()

  if (c && c.x0 !== undefined) {
    const x0 = c.x0
    const x1 = c.x1 ?? 100
    for (let _i = 0; _i <= AXIS_TICKS; _i++) {
      const x = (_i / AXIS_TICKS) * $w
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, $h)
      ctx.stroke()
      ctx.textAlign = 'center'
      ctx.fillText((x0 + (_i / AXIS_TICKS) * (x1 - x0)).toFixed(GRID_STYLE.yLabelDecimals), x, $h - GRID_STYLE.xLabelOffsetY)
    }
  } else {
    // 竖线画**列边界**（i/dX·w）—— 与 Axis.band 的分组子列天然对齐；
    // 标签读 locator.x 取真实柱心（dY > 1 时自动落在子列中心）
    const dX = $model.dimXMap.size || 1
    const colW = $w / dX
    const keys = [...$model.dimXMap.keys()]
    for (let _i = 0; _i <= dX; _i++) {
      const x = _i * colW
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, $h)
      ctx.stroke()
    }
    // 每组标签居中于该列的**柱簇中心**（不改投影、只读投影）
    for (let _i = 0; _i < dX; _i++) {
      if (!keys[_i]) continue
      const el = $model.elements.find(($e) => String($e[$e.dimX]) === keys[_i])
      const x = el ? $locator.x(el, c!, _i, 0) : _i * colW + colW / 2
      ctx.textAlign = 'center'
      ctx.fillText(keys[_i], x, $h - GRID_STYLE.xLabelOffsetY)
    }
  }

  const v0 = c?.v0 ?? 0
  const v1 = c?.v1 ?? 100
  for (let _i = 0; _i <= AXIS_TICKS; _i++) {
    const y = (_i / AXIS_TICKS) * $h
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo($w, y)
    ctx.stroke()
    ctx.textAlign = 'left'
    ctx.fillText((v1 - (_i / AXIS_TICKS) * (v1 - v0)).toFixed(GRID_STYLE.yLabelDecimals), GRID_STYLE.yLabelOffsetX, y + GRID_STYLE.yLabelOffsetY)
  }
}

// polar — 同心环 + 放射线
function polar($ctx: CanvasRenderingContext2D, $w: number, $h: number): void {
  const ctx = $ctx
  const cx = $w / 2
  const cy = $h / 2
  const maxR = Math.min($w, $h) / 2

  for (let _i = 1; _i <= RADAR_GRID_LAYERS; _i++) {
    const r = (maxR / RADAR_GRID_LAYERS) * _i
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, TAU)
    ctx.stroke()
    ctx.fillText(`${Math.round(r)}`, cx + GRID_STYLE.yLabelOffsetX, cy - r + GRID_STYLE.yLabelOffsetY)
  }
  for (let _i = 0; _i < POLAR_GRID_RAYS; _i++) {
    const ang = (_i / POLAR_GRID_RAYS) * TAU
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR)
    ctx.stroke()
  }
}

// radar — 维度多边形环 + 轴标签
function radar($ctx: CanvasRenderingContext2D, $w: number, $h: number, $model: TsuModel): void {
  const ctx = $ctx
  const cx = $w / 2
  const cy = $h / 2
  const maxR = radarR($w, $h)   // 与 radar 投影同一来源
  const dY = $model.dimYMap.size || 1
  const keys = [...$model.dimYMap.keys()]

  for (let _l = 1; _l <= RADAR_GRID_LAYERS; _l++) {
    const r = (maxR / RADAR_GRID_LAYERS) * _l
    ctx.beginPath()
    for (let _d = 0; _d < dY; _d++) {
      const ang = ARC_START_ANGLE + (_d / dY) * TAU
      const px = cx + Math.cos(ang) * r
      const py = cy + Math.sin(ang) * r
      if (_d === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()
  }

  for (let _d = 0; _d < dY; _d++) {
    const ang = ARC_START_ANGLE + (_d / dY) * TAU
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR)
    ctx.stroke()
    if (!keys[_d]) continue

    // 标签锚点 — 外向象限决定文字对齐
    const cosA = Math.cos(ang)
    const sinA = Math.sin(ang)
    if (sinA < -LABEL_AXIS_THRESHOLD) {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
    } else if (sinA > LABEL_AXIS_THRESHOLD) {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
    } else if (cosA < -LABEL_AXIS_THRESHOLD) {
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
    } else {
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
    }
    const labelR = maxR + RADAR_LABEL_OFFSET
    ctx.fillText(keys[_d], cx + cosA * labelR, cy + sinA * labelR)
  }
}

const GRID: Partial<Record<string, GridDrawer>> = { cartesian, polar, radar }
