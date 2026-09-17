/**
 * kit — helper 通用工具箱：类型/字符串/UUID/深拷贝/绑定、
 * Hs_Wish 异步链、Hs_Pool 对象池、Intake 缓冲队列（Hs_ = helper 工具族约定）
 */
// —— 类型判断 ——

type AnyObject = Record<string, any>

export function Hs_noop () {}

const toString = Object.prototype.toString
export function Hs_typeOf ($value: unknown) {
  return toString.call($value).slice(8, -1).toLowerCase()
}

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

export function Hs_valueOrDefault<T>($value: T | undefined, $defaultValue: T) {
  return Hs_isNon($value) ? $defaultValue : $value
}

// —— 字符串工具 ——

/** String.trim 增强版（可指定剥离字符） */
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
 * Hs_Wish（许愿）— 异步任务链：comeTrue 每次推进一格（扁平游标不递归），
 * 由 Scheduler tick 统一驱动。new Hs_Wish().wish(fn).wish(fn)...comeTrue()
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

  wish ($fn: WishFn): this {
    this.steps.push($fn)
    return this
  }

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

  /** 并发 — 全部 done 才还愿（类 Promise.all） */
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

/** Hs_Pool — 对象池零 GC（复用少量临时对象；SoA TypedArray 本身零分配） */
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
 * Intake — 摄入口：tick 外（浏览器事件）feed 投递 → 暂存，
 * tick 内（scheduler task）drain 提取清空；16ms 内多次 feed 合并 = 天然节流
 */
export interface Intake<T = any> {
  feed(msg: T): void
  drain(): T[]
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

export function Hs_createIntake<T = any>(): Intake<T> {
  return new IntakeImpl<T>()
}
