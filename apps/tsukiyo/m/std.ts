/**
 * std（标准化）— 宽表 → 长表 melt：
 * input [{ user:'kurumi', top:30, mid:100, bot:50 }] + dim { dimX:'user', dimY:['top','mid','bot'] }
 * → [{ dimX:'user', dimY:'top', user:'kurumi', value:30 }, ...]
 * 基元数组输入（无 dim）：[10,20] → [{ dimX:'index', dimY:'value', index:0, value:10 }, ...]
 */
import type { Element, DimConf } from '../yomi'

export function std ($raw: any[], $dim?: DimConf): Element[] {
  // 无 dim → 按索引展开
  if (!$dim) {
    return $raw.map(($val, $i) => ({
      dimX: 'index',
      dimY: 'value',
      index: $i,
      value: $val,
    }))
  }

  const { dimX: dimXKey, dimY: dimYKeys } = $dim
  const result: Element[] = []

  for (let _r = 0; _r < $raw.length; _r++) {
    const row = $raw[_r]

    for (let _d = 0; _d < dimYKeys.length; _d++) {
      const dimYKey = dimYKeys[_d]
      const value = row[dimYKey]

      // 透传原始字段 + 标准化字段
      result.push({
        ...row,
        dimX: dimXKey,
        dimY: dimYKey,
        value,
      })
    }
  }

  return result
}
