/**
 * grid — 默认网格背景层绘制（独立模块）：
 * 笛卡尔横竖线+刻度 / polar 同心圆+辐射线 / radar 多边形+dimY 标签。
 * 消费主引擎 locator/coordCtx（grid 刻度是主数据的派生，不进子引擎工作流）；
 * 视线仿射由调用方（layering）在 Hcvs_retina setTransform 注入 —— 与主层
 * 同一份 cameraMatrix（缩放平移因子天然一致，grid 不绑任何事件）。
 */
import type { ITsukiyoLocator } from '../yomi'
import type { TsuModel } from '../m/model'
import { radarRadius } from './coord'
import {
  ARC_START_ANGLE, AXIS_TICKS, GRID_STYLE, LABEL_AXIS_THRESHOLD,
  POLAR_GRID_RAYS, RADAR_GRID_LAYERS, RADAR_LABEL_OFFSET,
  TAU,
} from '../helper/const'

// —— grid family registry — cartesian / polar / radar drawers, table-driven
// dispatch (the default grid layer picks its family from locator.grid) ——

type GridDrawer = ($ctx: CanvasRenderingContext2D, w: number, h: number, model: TsuModel, locator: ITsukiyoLocator | null) => void

/** 默认网格层绘制入口 — 样式装配 + 族分派（查 GRID_RENDERERS 注册表） */
export function drawGridLayer(
  $ctx: CanvasRenderingContext2D, w: number, h: number,
  $model: TsuModel, $locator: ITsukiyoLocator | null,
): void {
  $ctx.strokeStyle = GRID_STYLE.stroke
  $ctx.lineWidth = GRID_STYLE.lineWidth
  $ctx.fillStyle = GRID_STYLE.labelFill
  $ctx.font = GRID_STYLE.labelFont
  $ctx.textBaseline = 'top'
  const drawer = GRID_RENDERERS[$locator?.grid ?? 'cartesian'] ?? drawCartesianGrid
  drawer($ctx, w, h, $model, $locator)
}

// cartesian — Y axis + X ticks (num domain) / cat columns + horizontal ticks
function drawCartesianGrid($ctx: CanvasRenderingContext2D, w: number, h: number, model: TsuModel, locator: ITsukiyoLocator | null): void {
  const ctx = $ctx
  const coordCtx = locator?.ctx ?? null
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, h)
  ctx.stroke()
  if (locator?.x.kind === 'num') {
    const xMin = coordCtx?.xMin ?? 0
    const xMax = coordCtx?.xMax ?? 100
    for (let _i = 0; _i <= AXIS_TICKS; _i++) {
      const x = (_i / AXIS_TICKS) * w
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
      const tickVal = xMin + (_i / AXIS_TICKS) * (xMax - xMin)
      ctx.textAlign = 'center'
      ctx.fillText(tickVal.toFixed(GRID_STYLE.yLabelDecimals), x, h - GRID_STYLE.xLabelOffsetY)
    }
  } else {
    // cat columns — grid lines ride the column CENTERS (same source as the
    // coord cartesianColX projection): elements using Shapes.rectC (centered
    // anchor) sit symmetric about the line; a boundary-line variant would
    // sit half an element off every mark
    const dimXCount = model.dimXMap.size || 1
    const colW = w / dimXCount
    const dimXKeys = [...model.dimXMap.keys()]
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
  }
  const vMin = coordCtx ? coordCtx.valueMin : 0
  const vMax = coordCtx ? coordCtx.valueMax : 100
  for (let _i = 0; _i <= AXIS_TICKS; _i++) {
    const y = (_i / AXIS_TICKS) * h
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
    const tickVal = vMax - (_i / AXIS_TICKS) * (vMax - vMin)
    ctx.textAlign = 'left'
    ctx.fillText(tickVal.toFixed(GRID_STYLE.yLabelDecimals), GRID_STYLE.yLabelOffsetX, y + GRID_STYLE.yLabelOffsetY)
  }
}

function drawPolarGrid($ctx: CanvasRenderingContext2D, w: number, _h: number): void {
  const ctx = $ctx
  const cx = w / 2
  const cy = _h / 2
  const maxR = Math.min(w, _h) / 2
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

function drawRadarGrid($ctx: CanvasRenderingContext2D, w: number, h: number, model: TsuModel): void {
  const ctx = $ctx
  const cx = w / 2
  const cy = h / 2
  const maxR = radarRadius(w, h)   // same source as coord (label offset included)
  const dimYCount = model.dimYMap.size || 1
  const dimYKeys = [...model.dimYMap.keys()]
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
  for (let _d = 0; _d < dimYCount; _d++) {
    const ang = ARC_START_ANGLE + (_d / dimYCount) * TAU
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR)
    ctx.stroke()
    const labelR = maxR + RADAR_LABEL_OFFSET
    const lx = cx + Math.cos(ang) * labelR
    const ly = cy + Math.sin(ang) * labelR
    if (dimYKeys[_d]) {
      const cosA = Math.cos(ang)
      const sinA = Math.sin(ang)
      if (sinA < -LABEL_AXIS_THRESHOLD) {
        ctx.textAlign = 'center'   // top
        ctx.textBaseline = 'bottom'
      } else if (sinA > LABEL_AXIS_THRESHOLD) {
        ctx.textAlign = 'center'   // bottom
        ctx.textBaseline = 'top'
      } else if (cosA < -LABEL_AXIS_THRESHOLD) {
        ctx.textAlign = 'right'    // left
        ctx.textBaseline = 'middle'
      } else {
        ctx.textAlign = 'left'     // right
        ctx.textBaseline = 'middle'
      }
      ctx.fillText(dimYKeys[_d], lx, ly)
    }
  }
}

/** grid family registry — the default layer dispatches by locator.grid */
const GRID_RENDERERS: Record<string, GridDrawer> = {
  cartesian: drawCartesianGrid,
  polar: drawPolarGrid,
  radar: drawRadarGrid,
}
