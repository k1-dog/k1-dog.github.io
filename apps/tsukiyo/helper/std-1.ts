/**
 * std-1 (standardize) — 数据模型标准化工具包
 *
 * 包含：类型判断、字符串工具、UUID 生成、深拷贝、异步链（Hs_Wish）、
 *       对象池（Hs_Pool）、数据源 melt 标准化、Intake 缓冲队列
 *
 * Hs_ 前缀 = helper_standardize，语义简洁清晰
 */
// —— 类型判断 ——

type AnyObject = Record<string, any>

export function Hs_noop () {}

const toString = Object.prototype.toString
export function Hs_typeOf ($value: unknown) {
  return toString.call($value).slice(8, -1).toLowerCase()
}

/**
 * Returns true if `value` is an object (excluding null), else returns false.
 */
export function Hs_isObj($v: unknown): $v is AnyObject {
  return $v !== null && Hs_typeOf($v) === 'object'
}

export const Hs_isFunction = ($value: unknown): $value is (...args: any[]) => any => typeof $value === 'function'

export function Hs_isNon ($v: unknown) {
    let _isNon: boolean = false
    if ($v === null || $v === undefined) _isNon = true
    else if (typeof $v === 'string' && !$v.length) _isNon = true
    else if (Hs_isObj($v)) {
        if (!Object.getOwnPropertyNames($v).length) {
            _isNon = true
        }
    }
    return _isNon
}

/**
 * Returns `value` if defined, else returns `defaultValue`.
 */
export function Hs_valueOrDefault<T>($value: T | undefined, $defaultValue: T) {
  return Hs_isNon($value) ? $defaultValue : $value
}

// —— 字符串工具 ——

/**
 * @description String.trim() 增强版
 */
export function Hs_Trim ($str: string, $char?: string) {
  let _cleanStr: string = $str
  if ($char) {
    _cleanStr = $str.replace(new RegExp(`^${$char}|${$char}$`, 'g'), '')
  }

  return _cleanStr.trim()
}

// —— UUID 生成 ——

type UUID_STR_T = string
export function Hs_M9UUID () {
  var m9_I_uid = -1
  var m9_A_uid = -1
  return function ($M9_UID_TYPE: 'I' | 'A' = 'I'): UUID_STR_T {
    const PaddingZeroBit = ($UID: number, $bitLen = 9) => {
      let _uidStr = String($UID)
      const paddingLen = $bitLen - _uidStr.length
      for (let _c = 0; _c <= paddingLen; _c++) {
        _uidStr = '0' + _uidStr
      }

      return _uidStr
    }
    if ($M9_UID_TYPE === 'I') {
      m9_I_uid++
      const I_uid = 'I' + PaddingZeroBit(m9_I_uid)
      return I_uid
    } else if ($M9_UID_TYPE === 'A') {
      m9_A_uid++
      const A_uid = 'A' + PaddingZeroBit(m9_A_uid)
      return A_uid
    }

    return '0'
  }
}

// —— 深拷贝 ——

export function Hs_cloneDeep ($data: any) {
  const dataType = Hs_typeOf($data)
  if (dataType !== 'array' && dataType !== 'object') {
    return $data
  }

  const cloneData: Array<any> | object = dataType === 'array' ? [] : {}
  if (dataType === 'array') {
    for (let _i = 0; _i < $data.length; _i++) {
      const oldItem = $data[_i]
      const newItem = Hs_cloneDeep(oldItem);
      (cloneData as any[]).push(newItem)
    }
  } else {
    const objKeys = Object.keys($data)
    for (let _j = 0; _j < objKeys.length; _j++) {
      const k = objKeys[_j]
      const oldValue = $data[k]
      const newValue = Hs_cloneDeep(oldValue)
      cloneData[k] = newValue
    }
  }

  return cloneData
}

// —— this 绑定 ——

export function Hs_bindThis ($this: any, $methodNames: Array<any> = [], ...$arguments: any[]) {
  $methodNames.forEach($methodName => {
    $this[$methodName] && ($this[$methodName] = $this[$methodName].bind($this, ...$arguments))
  })
}

// —— 异步任务链 ——

/**
 * Hs_Wish (许愿) — 简洁的异步任务链，语义即目的：愿望不会立马实现。
 *
 * 扁平游标设计：comeTrue 每次推进一格，不递归，栈深度恒为 1。
 * 由 Scheduler 的 tick 统一驱动，与其他逻辑在同一帧内串行执行。
 *
 * .eg → new Hs_Wish()
 *         .wish((_, ct) => ct(1))
 *         .wish((prev, ct) => ct(prev + 2))
 *         .comeTrue()   // value === 3
 */
type WishFn = (prev: any, comeTrue: (v: any) => void) => void

export class Hs_Wish {
  private steps: WishFn[] = []
  private cursor = 0
  private _value: any = null
  done = false

  constructor (firstValue: any = null) {
    this._value = firstValue
  }

  // 添加愿望
  wish ($fn: WishFn): this {
    this.steps.push($fn)
    return this
  }

  // 还愿 — 推进一格，由 scheduler tick 调用
  comeTrue ($v?: any): boolean {
    if (this.done) return true
    if ($v !== undefined) this._value = $v
    if (this.cursor < this.steps.length) {
      this.steps[this.cursor](this._value, ($next: any) => { this._value = $next })
      this.cursor++
    }
    if (this.cursor >= this.steps.length) this.done = true
    return this.done
  }

  get value (): any { return this._value }

  // 并发 — 所有愿望全部 done 才还愿（类似 Promise.all）
  static all ($wishes: Hs_Wish[]): Hs_Wish {
    const w = new Hs_Wish()
    w.wish(($_, $ct) => {
      const collect = () => {
        if (!$wishes.every($x => $x.done)) return
        $ct($wishes.map($x => $x.value))
      }
      $wishes.forEach($x => {
        const orig = $x.comeTrue.bind($x)
        $x.comeTrue = ($vv?: any) => { const d = orig($vv); if (d) collect(); return d }
      })
      collect()
    })
    return w
  }
}

// —— 对象池 ——

/**
 * Hs_Pool — 对象池，零 GC。SoA 本身用 TypedArray 零分配，
 * 此池用于复用 Shape 描述符等少量临时对象。
 */
export class Hs_Pool<T> {
  private free: T[] = []
  constructor (private factory: () => T) {}

  acquire (): T {
    return this.free.pop() ?? this.factory()
  }

  release ($obj: T): void {
    this.free.push($obj)
  }
}

// —— Intake 缓冲队列 ——

/**
 * Intake — 摄入口：外部世界向系统内部投递异步输入的缓冲队列。
 *
 * 职责单一：feed（投递） + drain（提取清空）。
 * 由 Scheduler 统一持有，外部事件回调 feed，tick 内 task drain。
 *
 * tick 外部（浏览器事件）→ feed → Intake 暂存
 * tick 内部（scheduler task）→ drain → 消费
 *
 * 16ms 内的多次 feed 在 drain 时合并，天然节流。
 */
export interface Intake<T = any> {
  /** 投递（tick 外调用 — 外部世界向系统摄入） */
  feed(msg: T): void
  /** 提取并清空（tick 内调用 — 系统消费已摄入的） */
  drain(): T[]
  /** 是否有未消费的摄入 */
  readonly pending: boolean
}

export class IntakeImpl<T = any> implements Intake<T> {
  private queue: T[] = []
  private _pending = false

  feed($msg: T): void {
    this.queue.push($msg)
    this._pending = true
  }

  drain(): T[] {
    if (!this._pending) return []
    const msgs = this.queue
    this.queue = []
    this._pending = false
    return msgs
  }

  get pending(): boolean {
    return this._pending
  }
}

/** 工厂 — 创建 Intake 实例 */
export function Hs_createIntake<T = any>(): Intake<T> {
  return new IntakeImpl<T>()
}
