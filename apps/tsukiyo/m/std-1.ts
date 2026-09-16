/**
 * input([
 *      { user: 'kurumi', top: 30, mid: 100, bot: 50 },
 *      { user: 'origami', top: 80, mid: 80, bot: 80 }
 * ])
 * dim -> { dimX: 'user', dimY: ['top', 'mid', 'bot'] }
 * === ===
 * standard after => [
 *      { dimY: 'top', dimX: 'user', user: 'kurumi', value: 30 },
 *      { dimY: 'top', dimX: 'user', user: 'origami', value: 80 },
 *      { dimY: 'mid', dimX: 'user', user: 'kurumi', value: 100 },
 *      { dimY: 'mid', dimX: 'user', user: 'origami', value: 80 },
 *      { dimY: 'bot', dimX: 'user', user: 'kurumi', value: 50 },
 *      { dimY: 'bot', dimX: 'user', user: 'origami', value: 80 }
 * ]
 */

/**
 * input([
 *      { pageUrl: 'www.k1.com/n1', visit: 10, apiUse: 222, key: 'p1' },
 *      { pageUrl: 'www.k1.com/n2', visit: 20, apiUse: 333, key: 'p2' },
 *      { pageUrl: 'www.k1.com/n3', visit: 100, apiUse: 444, key: 'p3' }
 * ])
 * dim -> { dimX: 'pageUrl', dimY: ['visit', 'apiUse'] }
 * === ===
 * standard after => [
 *      { dimY: 'visit', dimX: 'pageUrl', pageUrl: 'www.k1.com/n1', value: 10 },
 *      { dimY: 'visit', dimX: 'pageUrl', pageUrl: 'www.k1.com/n2', value: 20 },
 *      { dimY: 'visit', dimX: 'pageUrl', pageUrl: 'www.k1.com/n3', value: 100 },
 *      { dimY: 'apiUse', dimX: 'pageUrl', pageUrl: 'www.k1.com/n1', value: 222 },
 *      { dimY: 'apiUse', dimX: 'pageUrl', pageUrl: 'www.k1.com/n2', value: 333 },
 *      { dimY: 'apiUse', dimX: 'pageUrl', pageUrl: 'www.k1.com/n3', value: 444 },
 * ]
 */


/**
 * std (标准化) — 宽表 → 长表 melt，实现 m/std-1.ts 规范。
 *
 * input: [{ user:'kurumi', top:30, mid:100, bot:50 }]
 * dim:   { dimX:'user', dimY:['top','mid','bot'] }
 * →
 * [
 *   { dimX:'user', dimY:'top', user:'kurumi', value:30 },
 *   { dimX:'user', dimY:'mid', user:'kurumi', value:100 },
 *   { dimX:'user', dimY:'bot', user:'kurumi', value:50 }
 * ]
 *
 * 也支持基元数组输入：[10, 20, 100] → [{ dimX:'index', dimY:'value', value:10 }, ...]
 */
import type { Element, DimConf } from '../yomi'

export function std ($raw: any[], $dim?: DimConf): Element[] {
  // 基元数组：无维度配置时，按索引展开
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
