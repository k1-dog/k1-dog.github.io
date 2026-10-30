/**
 * canvas — canvas 视觉落地：把 CSS 几何、层叠顺序与视口变换
 * 变成真实 canvas 像素的唯一位置
 */
import type { TsuModel } from '../m/model'
import { DPR_MAX } from './const'

/** 子层 canvas 摆放 — 子层画布的层叠规则 */
export interface HcvsPlace {
  z: number
  /** 'host' = 贴合主 canvas 宿主盒（inset:0） */
  size?: 'host'
  /** 主 canvas — 插入与对齐的参照 */
  main: HTMLCanvasElement
  /** 待摆放的 canvas（新建插入或既有重摆） */
  canvas?: HTMLCanvasElement
}

export interface RetinaResult {
  dpr: number
  cssWidth: number
  cssHeight: number
  deviceWidth: number
  deviceHeight: number
  changed: boolean
  canvas: HTMLCanvasElement
}

export function Hcvs_getDpr(): number {
  return Math.min(window.devicePixelRatio || 1, DPR_MAX)
}

/**
 * Hcvs_retina — canvas 视觉落地的唯一入口：建画布 + 层叠摆放（z 序 / host 贴合）
 * + CSS 尺寸 + DPR×视口变换SoA x/y 保持 CSS 空间（与 e.offsetX/offsetY 同空间）
 * $view — 六元 2D 仿射 [a,b,c,d,e,f]；十六元 3D 裁剪矩阵无 2D ctx 意义故跳过
 */
export function Hcvs_retina(
  $canvas: HTMLCanvasElement,
  $w: number,
  $h: number,
  $view?: Float32Array | null,
  $place?: HcvsPlace | null,
): RetinaResult {
  const dpr = Hcvs_getDpr()

  // 摆放 — 相对主 canvas 的绝对层叠
  if ($place) {
    const s = $canvas.style
    s.position = 'absolute'
    s.pointerEvents = 'none'
    s.zIndex = String($place.z)
    if ($place.size === 'host') {
      s.inset = '0'
    } else {
      s.left = `${$place.main.offsetLeft}px`
      s.top = `${$place.main.offsetTop}px`
    }
    const parent = $place.main.parentElement
    if (parent && $canvas.parentElement !== parent) {
      if ($place.z < 0) parent.insertBefore($canvas, $place.main)
      else parent.insertBefore($canvas, $place.main.nextSibling)
    }
  }

  // CSS 尺寸 — 显式尺寸即布局所有者（replaced 元素不会仅凭 CSS 拉伸）
  // 0×0 盒不写——否则会把画布锁死直到宿主布局落地
  const cssW = Math.max(0, Math.floor($w))
  const cssH = Math.max(0, Math.floor($h))
  if (cssW > 0 && cssH > 0 && $place?.size !== 'host') {
    $canvas.style.width = `${cssW}px`
    $canvas.style.height = `${cssH}px`
  }

  const devW = Math.floor(cssW * dpr)
  const devH = Math.floor(cssH * dpr)
  const changed = $canvas.width !== devW || $canvas.height !== devH
  if (changed) {
    $canvas.width = devW
    $canvas.height = devH
  }

  // 基 × view — 单次 setTransform 绝不累积
  const ctx = $canvas.getContext('2d')
  if (ctx && (!$view || $view.length === 6)) {
    const a = $view ? $view[0] : 1
    const b = $view ? $view[1] : 0
    const c = $view ? $view[2] : 0
    const d = $view ? $view[3] : 1
    const e = $view ? $view[4] : 0
    const f = $view ? $view[5] : 0
    ctx.setTransform(dpr * a, dpr * b, dpr * c, dpr * d, dpr * e, dpr * f)
  }

  return { dpr, cssWidth: cssW, cssHeight: cssH, deviceWidth: devW, deviceHeight: devH, changed, canvas: $canvas }
}

// —— 批分组：连续 run 合并（零每帧分配）——
// 数据序 = 绘制序 = z 序——相邻同形状的槽合并成一批、形状一变即开新批
// 全局按形状归桶会打乱数据序（后画的柱子盖住先画的虚线）故不采用

export interface Batch {
  id: number
  indices: number[]
  count: number
}

/** 复用批对象池 —— 一次 flush 结束即归还、零 GC */
const batchPool: Batch[] = []
let _batchUsed = 0

function takeBatch(): Batch {
  let _b = batchPool[_batchUsed]
  if (!_b) _b = batchPool[_batchUsed] = { id: 0, indices: [], count: 0 }
  _batchUsed++
  _b.indices.length = 0
  _b.count = 0
  return _b
}

const out: Batch[] = []

/** 连续 run 分组 — 相邻同形状合并为一批；返回的数组与 indices 均为复用缓冲 */
export function Hcvs_batch($model: TsuModel, $els: number[]): Batch[] {
  out.length = 0
  _batchUsed = 0
  let _cur: Batch | null = null
  for (const ξ of $els) {
    const id = $model.id[ξ]
    if (!_cur || _cur.id !== id) {
      _cur = takeBatch()
      _cur.id = id
      out.push(_cur)
    }
    _cur.indices.push(ξ)
    _cur.count++
  }
  return out
}
