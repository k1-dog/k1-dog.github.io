/**
 * std（标准化）— input 阶段的归一化：维度探测（无 dim 时按字段类型推断）、
 * 类型强制（value 一律 Number）、无效剔除（非有限数行丢弃并汇总告警）、
 * 规范排序（按 dimX 首次出现序稳定排序——系列链依赖有序）
 * 形态：宽表按 { dimX, dimY[] } melt 为长表；基元数组按索引展开（原字段全透传）
 */
import type { Element, DimConf } from '../yomi'

/** 一行可用于判定的样本量 — 类型探测只看前若干行、避免全表扫描 */
const PROBE_N = 32

/** 字段名 → 是否为度量（全部样本都是有限数才算） */
function isMeasure($raw: any[], $key: string): boolean {
  const n = Math.min($raw.length, PROBE_N)
  let _seen = 0
  for (let _i = 0; _i < n; _i++) {
    const v = $raw[_i]?.[$key]
    if (v === null || v === undefined) continue
    if (typeof v !== 'number' || !Number.isFinite(v)) return false
    _seen++
  }
  return _seen > 0
}

/** 维度探测 — 数值字段作度量、其余作维度；度量多于 1 个时取第一个作 dimX 之外的轴 */
function probeDim($raw: any[]): DimConf {
  const keys = new Set<string>()
  const n = Math.min($raw.length, PROBE_N)
  for (let _i = 0; _i < n; _i++) {
    const row = $raw[_i]
    if (!row || typeof row !== 'object') continue
    for (const k of Object.keys(row)) keys.add(k)
  }
  const measures: string[] = []
  const dims: string[] = []
  for (const k of keys) (isMeasure($raw, k) ? measures : dims).push(k)

  // 维度优先作 dimX；没有维度就退到行下标
  const dimX = dims[0] ?? 'index'
  const dimY = measures.length > 0 ? measures : ['value']
  return { dimX, dimY }
}

/**
 * 归一化 — 产出 canonical elements（value 必为有限数、按 dimX 稳定有序）
 */
export function std($raw: any[], $dim?: DimConf): Element[] {
  // 基元数组 — 按索引展开、原字段全透传（自定义 locator/shapeFn 依赖）
  if (!$raw || $raw.length === 0) return []
  if (!$dim) {
    if (typeof $raw[0] !== 'object' || $raw[0] === null) {
      const out: Element[] = []
      for (let _i = 0; _i < $raw.length; _i++) {
        const v = Number($raw[_i])
        if (!Number.isFinite(v)) continue
        out.push({ dimX: 'index', dimY: 'value', index: _i, value: v, __ri: _i })
      }
      return out
    }
    // 对象数组但未声明 dim — 探测维度后走同一条 melt
    $dim = probeDim($raw)
  }

  const { dimX: dimXKey, dimY: dimYKeys } = $dim
  const out: Element[] = []
  let _dropped = 0

  for (let _r = 0; _r < $raw.length; _r++) {
    const row = $raw[_r]
    if (!row || typeof row !== 'object') continue
    for (let _d = 0; _d < dimYKeys.length; _d++) {
      const dimYKey = dimYKeys[_d]
      const v = Number(row[dimYKey])
      if (!Number.isFinite(v)) {
        _dropped++
        continue
      }
      // __ri — 原始行号：elements 是展开副本——evolve commit 需要回链到可变源行
      out.push({ ...row, dimX: dimXKey, dimY: dimYKey, value: v, __ri: _r })
    }
  }

  if (_dropped > 0) {
    console.warn(`[tsukiyo] input: dropped ${_dropped} row(s) with non-finite value`)
  }

  // 规范排序 — 按 dimX 首次出现序稳定排序（系列链要求同系列连续）
  const rank = new Map<string, number>()
  for (const el of out) {
    const k = String(el[dimXKey])
    if (!rank.has(k)) rank.set(k, rank.size)
  }
  if (rank.size > 1) {
    out.sort(($a, $b) => (rank.get(String($a[dimXKey]))! - rank.get(String($b[dimXKey]))!))
  }

  return out
}
