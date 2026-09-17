/**
 * Scheduler — 唯一时钟触发源（SC2 lockstep）：所有逻辑在 16ms tick 内串行确定性执行，
 * 帧内按序（前一个 done 才进下一个），逻辑完才绘制；无独立 RAF/Promise 乱序。
 * task 策略：数据流（input/point）done=true 等 reset；常驻（coord/interact/draw）每帧跑；
 * 异步（fetch）用 Hs_Wish 每帧推进一格，done=false 时 after 依赖方跳过。
 */
import type { Task } from '../yomi'
import { Hs_createIntake } from '../helper/kit'
import type { Intake } from '../helper/kit'
import { TICK_MS } from '../helper/const'

export class Scheduler {
  private logicQ: Task[] = []
  private drawQ: Task[] = []
  private intakes = new Map<string, Intake>()
  private rafId: number | null = null
  private lastTick = 0
  private executed = new Set<string>()   // tick 内已执行名集（帧间复用）

  // 唯一 RAF 入口
  start(): void {
    const onFrame = ($now: number) => {
      if ($now - this.lastTick >= TICK_MS) {
        this.lastTick = $now
        this.tick()
      }
      this.rafId = requestAnimationFrame(onFrame)
    }
    this.rafId = requestAnimationFrame(onFrame)
  }

  stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  // tick 内：① logic 按序 → ② draw
  private tick(): void {
    const executed = this.executed   // 常驻 task 执行后解除后续 after 依赖（同帧顺序约束）
    executed.clear()

    // ① logic — 单 task 抛错只跳过自身（rAF 保活）
    for (const t of this.logicQ) {
      if (t.done) continue
      if (t.after && !t.after.every($n => executed.has($n) || this.isDone($n))) continue
      try { t.step() } catch (err) { console.error(`[tsukiyo] task '${t.name}' threw`, err) }
      executed.add(t.name)
    }

    // ② draw — logic 全部推进后
    for (const t of this.drawQ) {
      if (t.done) continue
      if (t.after && !t.after.every($n => executed.has($n) || this.isDone($n))) continue
      try { t.step() } catch (err) { console.error(`[tsukiyo] task '${t.name}' threw`, err) }
    }
  }

  // 未注册视为 done
  private isDone($name: string): boolean {
    const t = this.logicQ.find($x => $x.name === $name) ?? this.drawQ.find($x => $x.name === $name)
    return t ? t.done : true
  }

  // 注册（同名替换）
  add($name: string, $step: () => void, $opts?: { after?: string[], phase?: 'draw' }): Task {
    const q = $opts?.phase === 'draw' ? this.drawQ : this.logicQ
    const exist = q.find($x => $x.name === $name)
    if (exist) {
      exist.step = $step
      exist.done = false
      exist.after = $opts?.after
      return exist
    }
    const t: Task = { name: $name, done: false, after: $opts?.after, step: $step }
    q.push(t)
    return t
  }

  // 外部重置（重新触发数据流）
  reset($name: string): void {
    const t = this.logicQ.find($x => $x.name === $name) ?? this.drawQ.find($x => $x.name === $name)
    if (t) t.done = false
  }

  // 标记 done
  complete($name: string): void {
    const t = this.logicQ.find($x => $x.name === $name) ?? this.drawQ.find($x => $x.name === $name)
    if (t) t.done = true
  }

  // 幂等移除（连带清 Intake）
  remove($name: string): void {
    this.logicQ = this.logicQ.filter($t => $t.name !== $name)
    this.drawQ = this.drawQ.filter($t => $t.name !== $name)
    this.intakes.delete($name)
  }

  // Intake — tick 外 feed → tick 内 drain
  intake($taskName: string): Intake {
    if (!this.intakes.has($taskName)) {
      this.intakes.set($taskName, Hs_createIntake())
    }
    return this.intakes.get($taskName)!
  }
}
