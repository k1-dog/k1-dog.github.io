/**
 * v/pen — 记录型画笔：执行 geo() 的同时记录局部包围盒。
 * 它不渲染任何东西（draw 阶段仍走原有 flush 通道），只在 shape / paths
 * 阶段跑一遍几何，让「路径 · 包围盒 · 命中」一次声明全部得到。
 * 与 Path2D 同签名，用户写的是原生 canvas 绘制指令，零新概念。
 */
import type { Aabb } from '../yomi'

/** 局部盒 — 原点 = 形状左上角，单位 = 画布 CSS px（与 SoA x/y 同空间） */
export interface Box {
  w: number
  h: number
  /** 锚点（图表坐标）— 需要把绝对坐标换算到局部时必须 */
  ox?: number
  oy?: number
  /** spec.slots 声明的自定义参数（缺省已填默认值） */
  [slot: string]: number
}

/**
 * 记录型画笔 — moveTo / lineTo / arc / bezierCurveTo / quadraticCurveTo /
 * rect / closePath 全部转发到 Path2D，同时把控制点并入包围盒。
 */
export class Pen {
  path = new Path2D()
  /** add() 追加的子图形（同槽内的第二、第三个可命中图形） */
  subs: Path2D[] = []
  /** 局部包围盒 — 空几何时为 [0,0]-[0,0] */
  readonly box: Aabb = [[0, 0], [0, 0]]

  private _cur: Path2D = this.path
  private _empty = true

  private x0 = Infinity
  private y0 = Infinity
  private x1 = -Infinity
  private y1 = -Infinity

  /** 复位 — 每槽重建前调用，复用同一支画笔（零每帧分配） */
  reset(): void {
    this.path = new Path2D()
    this.subs = []
    this._cur = this.path
    this._empty = true
    this.x0 = Infinity
    this.y0 = Infinity
    this.x1 = -Infinity
    this.y1 = -Infinity
  }

  /** 追加子图形 — 返回的 Path2D 同样被绘制与记录 */
  add(): Path2D {
    const p = new Path2D()
    this.subs.push(p)
    return p
  }

  /** 切换当前绘制目标（内部用；用户通过 add() 的返回值直接画，无需调用） */
  use($p: Path2D): void {
    this._cur = $p
  }

  private point($x: number, $y: number): void {
    if (!Number.isFinite($x) || !Number.isFinite($y)) return
    if ($x < this.x0) this.x0 = $x
    if ($y < this.y0) this.y0 = $y
    if ($x > this.x1) this.x1 = $x
    if ($y > this.y1) this.y1 = $y
    this._empty = false
  }

  moveTo($x: number, $y: number): void {
    this.point($x, $y)
    this._cur.moveTo($x, $y)
  }

  lineTo($x: number, $y: number): void {
    this.point($x, $y)
    this._cur.lineTo($x, $y)
  }

  quadraticCurveTo($cx: number, $cy: number, $x: number, $y: number): void {
    this.point($cx, $cy)
    this.point($x, $y)
    this._cur.quadraticCurveTo($cx, $cy, $x, $y)
  }

  bezierCurveTo($c1x: number, $c1y: number, $c2x: number, $c2y: number, $x: number, $y: number): void {
    this.point($c1x, $c1y)
    this.point($c2x, $c2y)
    this.point($x, $y)
    this._cur.bezierCurveTo($c1x, $c1y, $c2x, $c2y, $x, $y)
  }

  /** 圆弧 — 保守并入外接方框（含 rx/ry 旋转的椭圆弧） */
  arc($cx: number, $cy: number, $r: number, $a0: number, $a1: number): void
  arc($cx: number, $cy: number, $r: number, $a0: number, $a1: number, $anticlockwise?: boolean): void
  arc($cx: number, $cy: number, $r: number, $a0: number, $a1: number, $ccw?: boolean): void {
    this.point($cx - $r, $cy - $r)
    this.point($cx + $r, $cy + $r)
    this._cur.arc($cx, $cy, $r, $a0, $a1, $ccw)
  }

  ellipse($cx: number, $cy: number, $rx: number, $ry: number, $rot: number, $a0: number, $a1: number): void {
    const m = Math.max($rx, $ry)
    this.point($cx - m, $cy - m)
    this.point($cx + m, $cy + m)
    this._cur.ellipse($cx, $cy, $rx, $ry, $rot, $a0, $a1)
  }

  rect($x: number, $y: number, $w: number, $h: number): void {
    this.point($x, $y)
    this.point($x + $w, $y + $h)
    this._cur.rect($x, $y, $w, $h)
  }

  closePath(): void {
    this._cur.closePath()
  }

  /** 收尾 — 把累积范围写入 box（调用一次） */
  seal(): Aabb {
    const box = this.box
    if (this._empty) {
      box[0][0] = 0; box[0][1] = 0
      box[1][0] = 0; box[1][1] = 0
      return box
    }
    box[0][0] = this.x0; box[0][1] = this.y0
    box[1][0] = this.x1; box[1][1] = this.y1
    return box
  }
}

/** 复用的记录画笔 — shape / paths 阶段串行使用，避免每帧分配 */
export const PEN = new Pen()