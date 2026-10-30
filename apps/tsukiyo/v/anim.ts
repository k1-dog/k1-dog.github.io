/**
 * v/anim — anim 通道：SoA anim 的唯一写入者
 * 生长推进在 draw 阶段（绘制与生长共一节奏）；换代重置在 input 阶段（新数据到达）
 */
import type { TsuModel } from '../m/model'
import type { TsuDirty } from '../middleware/dirty'
import { ANIM_STEP } from '../helper/const'

/**
 * grow — 每个未完成槽推进一步（clamp）并标脏（下帧重绘）；全槽扫描——
 * 被剔除的槽也能长完；负值即 λDelay 入场等待（负 → 0 → 1）
 * 返回是否有推进——留下的脏标下一 tick 欠一次 flush（layering 已排干本拍）、draw 阶段为此唤醒时钟
 */
export function grow($m: TsuModel, $dirty: TsuDirty): boolean {
  const anim = $m.anim
  let _advanced = false
  for (let _ξ = 0; _ξ < $m.count; _ξ++) {
    const t = anim[_ξ]
    if (t >= 1) continue
    anim[_ξ] = Math.min(1, t + ANIM_STEP)
    $dirty.mark(_ξ)
    _advanced = true
  }
  return _advanced
}

/**
 * reset — 新数据代重启生长通道
 * λDelay 声明的负偏移保留（快照模式下直接到 1）
 */
export function reset($m: TsuModel, $snap: boolean): void {
  if ($snap) { $m.anim.fill(1, 0, $m.count); return }
  const anim = $m.anim
  const λ = $m.λ
  for (let _ξ = 0; _ξ < $m.count; _ξ++) {
    // 入场延迟以负值起步、grow 天然把「负 → 0 → 1」推过去
    anim[_ξ] = -λ[_ξ]
  }
}
