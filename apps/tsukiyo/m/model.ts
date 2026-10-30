/**
 * m/model — SoA 唯一数据源（并行 TypedArray 每槽一条）
 * 槽写入口集中于此；正交能力归各阶段所有
 * （dirty → middleware/dirty、aabb → middleware/spatial、维度划分 → m/scale、动画生长 → draw 阶段）
 */
import type { Element, DimConf, Aabb } from '../yomi'
import { DEFAULT_CAP, GEO_SLOTS_EACH_ELEM } from '../helper/const'

type TypedArrayCtor = new (n: number) => TypedArray
type TypedArray = Uint32Array | Uint16Array | Uint8Array | Float32Array

export class TsuModel {
  /** 原始业务数据 — input 最近投递的一批 */
  raw: any[] = []
  /** 归一化元素 — shape 阶段读取 */
  elements: Element[] = []
  /** 维度值 → 索引（scale 阶段由 elements 派生） */
  dimXMap: Map<string, number> = new Map()
  dimYMap: Map<string, number> = new Map()

  count = 0
  capacity = DEFAULT_CAP
  /** 数据代次 — shape 阶段递增 layering 读取 */
  gen = 0

  src:    Uint32Array   // slot → elements 索引
  dimX:   Uint32Array
  dimY:   Uint8Array
  value:  Float32Array
  x:      Float32Array  // 锚点 x（coord 写 render 读）
  y:      Float32Array
  w:      Float32Array  // 几何宽 / Δ 偏移
  h:      Float32Array
  /** 形状注册序号 — 唯一定型标识（替代旧 Prim 枚举） */
  id:     Uint16Array
  fill:   Uint32Array   // 打包 RGBA
  anim:   Float32Array  // 生长比例 0..1（anim 阶段独占写入）
  /** λDelay 声明（入场延迟步数）— shape 写入、reset 读取；与 anim 分离以免覆写进度 */
  λ:      Float32Array
  aux:    Float32Array  // 几何参数——每槽 GEO_SLOTS_EACH_ELEM 个

  /** 派生缓存（真源仍是 SoA + spec.geo 纯函数） */
  bounds: (Aabb | null)[] = []   // 槽位局部包围盒（shape/paths 阶段写入）
  paths:  (Path2D | null)[] = [] // 槽位主路径（同一时机重建、draw 直接 fill）
  subs:   (Path2D[] | null)[] = [] // 槽位子图形（Pen.add 产生）

  /** lock 集 — interact 派生的视觉态 render 读取 */
  hoverSlots = new Set<number>()
  clickSlots = new Set<number>()

  constructor(cap = DEFAULT_CAP) {
    this.capacity = cap
    this.src    = new Uint32Array(cap)
    this.dimX   = new Uint32Array(cap)
    this.dimY   = new Uint8Array(cap)
    this.value  = new Float32Array(cap)
    this.x      = new Float32Array(cap)
    this.y      = new Float32Array(cap)
    this.w      = new Float32Array(cap)
    this.h      = new Float32Array(cap)
    this.id     = new Uint16Array(cap)
    this.fill   = new Uint32Array(cap)
    this.anim   = new Float32Array(cap)
    this.λ      = new Float32Array(cap)
    this.aux    = new Float32Array(cap * GEO_SLOTS_EACH_ELEM)
    this.anim.fill(1)
  }

  grow($newCap: number): void {
    const growArr = <T extends TypedArray>($arr: T, $ctor: TypedArrayCtor): T => {
      const next = new $ctor($newCap) as T
      next.set($arr)
      return next
    }
    this.src    = growArr(this.src, Uint32Array)
    this.dimX   = growArr(this.dimX, Uint32Array)
    this.dimY   = growArr(this.dimY, Uint8Array)
    this.value  = growArr(this.value, Float32Array)
    this.x      = growArr(this.x, Float32Array)
    this.y      = growArr(this.y, Float32Array)
    this.w      = growArr(this.w, Float32Array)
    this.h      = growArr(this.h, Float32Array)
    this.id     = growArr(this.id, Uint16Array)
    this.fill   = growArr(this.fill, Uint32Array)
    this.anim   = growArr(this.anim, Float32Array)
    this.λ      = growArr(this.λ, Float32Array)
    const oldAux = this.aux
    this.aux = new Float32Array($newCap * GEO_SLOTS_EACH_ELEM)
    this.aux.set(oldAux.subarray(0, this.capacity * GEO_SLOTS_EACH_ELEM))
    this.capacity = $newCap
    this.anim.fill(1, this.count)
  }

  /** 确保 $n 个槽的容量（不足即扩容） */
  reserve($n: number): void {
    if ($n > this.capacity) this.grow(Math.max($n, this.capacity * 2))
  }

  /** 局部包围盒 — 派生缓存、未就绪时返回 null（调用方按零盒处理） */
  boundsOf($ξ: number): Aabb | null {
    return this.bounds[$ξ] ?? null
  }

  /** 写入派生缓存（shape / paths 阶段调用、与几何重建同一次时机） */
  cacheSlot($ξ: number, $path: Path2D | null, $subs: Path2D[] | null, $bounds: Aabb | null): void {
    this.paths[$ξ] = $path
    this.subs[$ξ] = $subs
    this.bounds[$ξ] = $bounds
  }

  /** slot → element（hover / tooltip 链路） */
  vToM($slot: number): Element | null {
    if ($slot < 0 || $slot >= this.count) return null
    return this.elements[this.src[$slot]] ?? null
  }

  /** element 查询 → slot 列表 */
  mToV($query: Partial<Element>): number[] {
    const keys = Object.keys($query)
    const out: number[] = []
    for (let _i = 0; _i < this.count; _i++) {
      const el = this.elements[this.src[_i]]
      if (!el) continue
      if (keys.every($k => el[$k] === ($query as any)[$k])) out.push(_i)
    }
    return out
  }
}

export type { DimConf }
