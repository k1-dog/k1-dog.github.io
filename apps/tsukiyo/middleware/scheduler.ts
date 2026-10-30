/**
 * scheduler — 唯一时钟：一拍 lockstep（逻辑相 → 绘制相）
 * 阶段产物以实参交棒（after 声明 声明序注入）
 * 按需驱动：无事可做即自停 park——feed 投递唤醒 stop 硬停
 */
import type { Task } from '../yomi'
import { Hs_createIntake } from '../helper/kit'
import type { Intake } from '../helper/kit'
import { TICK_MS } from '../helper/const'

export class Scheduler {
  private logicQ: Task[] = []
  private drawQ: Task[] = []
  private always = new Set<string>()
  private intakes = new Map<string, Intake>()
  /** 保活探针 — 全部为假时循环自停 */
  private probes = new Map<string, () => boolean>()
  private rafId: number | null = null
  /** 硬停（销毁 / 脱离画布）——wake 无效直到 start */
  private halted = false
  private last = 0
  /** 本 tick 产物 — 交棒负载 */
  private fresh = new Map<string, unknown>()
  /** 各阶段最近产物 — 常驻阶段跨 tick 读取 */
  private last$ = new Map<string, unknown>()

  /** start — 启动循环（清除硬停 幂等） */
  start(): void {
    this.halted = false
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(this.loop)
    this.notifyState()
  }

  /** stop — 硬停：取消循环 wake 无效直到 start */
  stop(): void {
    const was = this.state
    this.halted = true
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
    if (this.state !== was) this.notifyState()
  }

  /** park — 取消循环但可唤醒（离屏 / 空闲） */
  park(): void {
    if (this.rafId === null) return
    cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.notifyState()
  }

  /** wake — 唤醒停摆的循环（halted 或已运行时无操作） */
  wake(): void {
    if (this.halted || this.rafId !== null) return
    this.rafId = requestAnimationFrame(this.loop)
    this.notifyState()
  }

  /** 状态 — running / parked / halted；变更即推送到 onState */
  get state(): 'running' | 'parked' | 'halted' {
    if (this.halted) return 'halted'
    return this.rafId !== null ? 'running' : 'parked'
  }

  /** intake 是否有待处理（外部工作等 tick） */
  get pending(): boolean {
    for (const it of this.intakes.values()) if (it.pending) return true
    return false
  }

  /** 状态跃迁监听 — start / stop / park / wake / 自停五个跃迁点触发 */
  onState($cb: ($s: 'running' | 'parked' | 'halted') => void): () => void {
    this.stateCbs.add($cb)
    return () => { this.stateCbs.delete($cb) }
  }

  private stateCbs = new Set<($s: 'running' | 'parked' | 'halted') => void>()

  private notifyState(): void {
    const s = this.state
    for (const cb of this.stateCbs) cb(s)
  }

  private readonly loop = ($now: number): void => {
    this.rafId = null
    if ($now - this.last >= TICK_MS) {
      this.last = $now
      this.tick()
    }
    // 自停 — 无事可做；tick 中段 wake 已订帧则不自停
    if (this.halted || (!this.busy() && this.rafId === null)) {
      if (!this.halted) this.notifyState()
      return
    }
    // tick 中段 wake 已订下一帧——不双订
    if (this.rafId === null) this.rafId = requestAnimationFrame(this.loop)
  }

  /** 还有事做吗 — 待处理 feed 或任一保活探针为真 */
  private busy(): boolean {
    for (const it of this.intakes.values()) if (it.pending) return true
    for (const p of this.probes.values()) if (p()) return true
    return false
  }

  /** 一拍 lockstep — 逻辑相后绘制相 */
  tick(): void {
    this.fresh.clear()
    this.run(this.logicQ)
    this.run(this.drawQ)
  }

  private run($q: Task[]): void {
    for (const t of $q) {
      if (!this.always.has(t.name) && !this.fresh.has(t.name)) continue
      const after = t.after
      // 阶段读到其来源的最新产物——null 也是产物（空链路是真实回答）
      const deps = after === undefined ? [] : after.map($n =>
        this.fresh.has($n) ? this.fresh.get($n) : this.last$.get($n))
      let _p: unknown
      try {
        _p = t.step(...deps)
      } catch (err) {
        console.error(`[tsukiyo] stage '${t.name}' threw`, err)
        continue
      }
      if (_p === undefined) continue
      this.fresh.set(t.name, _p)
      this.last$.set(t.name, _p)
      // 级联 — 依赖方（逻辑相或绘制相）本 tick 即跑
      for (const q of [this.logicQ, this.drawQ]) {
        for (const d of q) if (d.after?.includes(t.name)) this.fresh.set(d.name, undefined)
      }
    }
  }

  /** 注册（同名替换）— step 返回值即该阶段产物 */
  add(
    $name: string,
    $step: (...deps: any[]) => unknown,
    $opts?: { after?: string[], phase?: 'draw', always?: boolean },
  ): Task {
    const q = $opts?.phase === 'draw' ? this.drawQ : this.logicQ
    if ($opts?.always) this.always.add($name)
    const exist = q.find($x => $x.name === $name)
    if (exist) {
      exist.step = $step
      exist.after = $opts?.after
      return exist
    }
    const t: Task = { name: $name, step: $step, after: $opts?.after }
    q.push(t)
    return t
  }

  remove($name: string): void {
    this.logicQ = this.logicQ.filter($t => $t.name !== $name)
    this.drawQ = this.drawQ.filter($t => $t.name !== $name)
    this.always.delete($name)
    this.fresh.delete($name)
    this.last$.delete($name)
    this.intakes.delete($name)
    this.probes.delete($name)
  }

  /** 保活探针 — 按名键控 remove 时丢弃 */
  addKeepAlive($name: string, $probe: () => boolean): void {
    this.probes.set($name, $probe)
  }

  /** intake — tick 外喂入（唤醒停摆时钟）tick 内 drain */
  intake($taskName: string): Intake {
    let _it = this.intakes.get($taskName)
    if (!_it) {
      const raw = Hs_createIntake()
      const self = this
      _it = {
        feed($msg: any): void { raw.feed($msg); self.wake() },
        drain(): any[] { return raw.drain() },
        get pending(): boolean { return raw.pending },
      }
      this.intakes.set($taskName, _it)
    }
    return _it
  }
}