/**
 * Scheduler — 整个系统唯一的时钟触发源
 *
 * 参考 SC2 lockstep：所有逻辑在同一个 16ms tick 内确定性地串行执行完毕
 * 帧内逻辑队列严格按序，前一个 done 才进下一个；逻辑全部完成后才进绘制
 * 无独立 RAF、无 Promise 微任务乱序，一切时序都在这里
 *
 * 数据流追溯：每个 task 的 from→to 体现在 step 函数体内对 model 的读写
 *
 * task 策略：
 *   - 数据流 task（input/point）：step 跑完置 done=true，等外部 reset 重触发
 *   - 常驻 task（coord/interact/draw）：不置 done，每帧都跑
 *   - 异步 task（fetch）：用 Hs_Wish，每帧推进一格，done=false 时 after 依赖方跳过
 *
 * 帧跳过优化：无动画（!hasAnim）且无脏数据时跳过 draw 阶段
 */
import type { Task } from '../yomi'
import { Hs_createIntake } from '../helper/std-1'
import type { Intake } from '../helper/std-1'
import { TICK_MS } from '../helper/const'

export class Scheduler {
  private logicQ: Task[] = []
  private drawQ: Task[] = []
  private intakes = new Map<string, Intake>()
  private rafId: number | null = null
  private lastTick = 0
  /** tick 内已执行 task 名集 — 帧间复用（clear 清空，零每帧分配） */
  private executed = new Set<string>()


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

  // 一个 tick 内：① logic 严格按序 → ② draw
  private tick(): void {
    // 跟踪当前 tick 内已执行的 task — 常驻 task 不设 done，
    // 但执行后应解除后续 after 依赖（同帧内顺序约束）
    const executed = this.executed
    executed.clear()

    // ① logic — after 依赖检查：已执行(executed) 或 已完成(isDone) 均可放行
    // step 包 try/catch — 单 task 抛错只跳过该 task，rAF 时钟保活（一抛全死是静默全灭事故的放大器）
    for (const t of this.logicQ) {
      if (t.done) continue
      if (t.after && !t.after.every($n => executed.has($n) || this.isDone($n))) continue
      try { t.step() } catch (err) { console.error(`[tsukiyo] task '${t.name}' threw`, err) }
      executed.add(t.name)
    }

    // ② draw — logic 全部推进完毕后
    for (const t of this.drawQ) {
      if (t.done) continue
      if (t.after && !t.after.every($n => executed.has($n) || this.isDone($n))) continue
      try { t.step() } catch (err) { console.error(`[tsukiyo] task '${t.name}' threw`, err) }
    }
  }

  // 查询 task 是否 done — 未注册视为已 done（不阻塞依赖方）
  private isDone($name: string): boolean {
    const t = this.logicQ.find($x => $x.name === $name) ?? this.drawQ.find($x => $x.name === $name)
    return t ? t.done : true
  }

  // 注册 task — 同名替换，避免重复累积
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

  // 外部重置 — 数据变化时调用，重新触发数据流
  reset($name: string): void {
    const t = this.logicQ.find($x => $x.name === $name) ?? this.drawQ.find($x => $x.name === $name)
    if (t) t.done = false
  }

  // 标记 done — task 内部完成后调用
  complete($name: string): void {
    const t = this.logicQ.find($x => $x.name === $name) ?? this.drawQ.find($x => $x.name === $name)
    if (t) t.done = true
  }

  // 幂等移除 task — 连带清除其 Intake（重复调用无副作用）
  remove($name: string): void {
    this.logicQ = this.logicQ.filter($t => $t.name !== $name)
    this.drawQ = this.drawQ.filter($t => $t.name !== $name)
    this.intakes.delete($name)
  }

  // 获取（或创建）task 的 Intake — 外部世界投递异步输入的统一入口
  // 外部事件回调 intake(name).feed(msg) → tick 内 task 调用 intake(name).drain() 消费
  intake($taskName: string): Intake {
    if (!this.intakes.has($taskName)) {
      this.intakes.set($taskName, Hs_createIntake())
    }
    return this.intakes.get($taskName)!
  }
}
