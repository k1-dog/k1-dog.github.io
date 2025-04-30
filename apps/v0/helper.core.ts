type AnyObject = Record<string, any>;

export function _noop () {}

/**
 * Returns true if `value` is an object (excluding null), else returns false.
 * @param $v - The value to test.
 * @since 2.7.0
 */
export function isObject($v: unknown): $v is AnyObject {
  return $v !== null && Object.prototype.toString.call($v) === '[object Object]';
}

export const H_isFunction = (value: unknown): value is (...args: any[]) => any => typeof value === 'function';

/**
 * Returns `value` if defined, else returns `defaultValue`.
 * @param value - The value to return if defined.
 * @param defaultValue - The value to return if `value` is undefined.
 */
export function valueOrDefault<T>(value: T | undefined, defaultValue: T) {
  return typeof value === 'undefined' ? defaultValue : value;
}

export const numberOrZero = (v: unknown | number) => +(v as number) || 0;

/**
 * @description String.trim() 增强版
 * @function H_Trim
 * @param $str @param $char
 * @return cleanStr
 */
export function H_Trim ($str: string, $char?: string) {
  let cleanStr: string = $str
  if ($char) {
    cleanStr = $str.replace(new RegExp(`^${$char}|${$char}$`, 'g'), '')
  }

  return cleanStr.trim()
}

/**
 * @description M9-UUID 生成器
 * @function H_M9UUID
 * @return { UUID_STR_T } @param UUID
 */
type UUID_STR_T = string
export function H_M9UUID () {
  var m9_I_uid = -1
  var m9_A_uid = -1
  return function ($M9_UID_TYPE: 'I' | 'A' = 'I'): UUID_STR_T {
    // 填充0位 - 默认9位
    const PaddingZeroBit = ($UID: number, $bitLen = 9) => {
      let uidStr = String($UID)
      const paddingLen = $bitLen - uidStr.length
      for (let _c = 0; _c <= paddingLen; _c++) {
        uidStr = '0' + uidStr
      }

      return uidStr
    }
    if ($M9_UID_TYPE === 'I') {
      // 位置探测器 实例号自增
      m9_I_uid++
      const I_uid = 'I' + PaddingZeroBit(m9_I_uid)
      return I_uid
    } else if ($M9_UID_TYPE === 'A') {
      // 动画控制器 实例号自增
      m9_A_uid++
      const A_uid = 'A' + PaddingZeroBit(m9_A_uid)
      return A_uid
    }

    return '0'
  }
}

const _toString = Object.prototype.toString
export function _TypeOf (value: unknown) {
  return _toString.call(value).slice(8, -1).toLowerCase()
}

export function H_M9CloneDeep ($data: any) {
  const dataType = _TypeOf($data)
  if (dataType !== 'array' && dataType !== 'object') {
    return $data
  }

  const _cloneData: Array<any> | object = dataType === 'array' ? [] : {}
  if (dataType === 'array') {
    for (let _i = 0; _i < $data.length; _i++) {
      const oldItem = $data[_i]
      const newItem = H_M9CloneDeep(oldItem);
      (_cloneData as any[]).push(newItem)
    }
  } else {
    const _objKeys = Object.keys($data)
    for (let _j = 0; _j < _objKeys.length; _j++) {
      const _k = _objKeys[_j]
      const oldValue = $data[_k]
      const newValue = H_M9CloneDeep(oldValue)
      _cloneData[_k] = newValue
    }
  }

  return _cloneData
}

/**
 * 
 * @param {函数上下文} $this
 * @param {待绑定函数} $methodNames 
 * @param {待绑定参数} $arguments
 */
export function H_StrongMethodsInThisClass ($this: any, $methodNames: Array<any> = [], ...$arguments: any[]) {
  $methodNames.forEach(methodName => {
    $this[methodName] && ($this[methodName] = $this[methodName].bind($this, ...$arguments))
  })
}

/**
 * @description [!important. 类似饼图中, 几个饼状图形的绘制, 要求连续性、同步性极强, 怀疑要自行设计出一种画笔绘制时异步变同步的机制, 才能解决这种连续式同步绘图的图形流畅度问题]
 * @class H_M9Whisper
 */
type ComeTrueFnT = ($currentComeTrueResult: any, $comeTrue: ($currentComeTrueResult: any) => any) => any
interface M9ComeI {
  _no: number | string;
  _value: any;
  _task: ($lastComeTrueResult: any) => any;
  _isDone: boolean;
  _next: M9ComeI | null;
}

// * <许愿> - <还愿>
// ! 难点1: <许愿顺序维持> 每个愿望的先后顺序 如何维持
// ! 难点2: <还愿顺序同步> 由于某种原因, 还愿的顺序可能与许愿顺序不同步, 如何同步还愿顺序, 和许愿顺序对应一致
// ! 难点3(SSS): <> 必须等所有许愿动作都结束后, 再开始执行还愿动作
// ? .eg -> new M9Whisper().whisper(f1).whisper((r1, $ct) => $ct(f2(r1))).whisper((r2, $ct) => $ct(f3(r2))).do()
// ?    .whisper(('', $ct) => { setTimeout(() => { $ct(974) }) }).whisper((r3, $ct))
export class H_M9Whisper {
  _taskSeq: number = 0
  // _waitingTasks: Map<M9ComeI['_no'], M9ComeI> = new Map()
  _firstCome: M9ComeI = { _no: '<Start>', _value: null, _task: _noop, _isDone: false, _next: null }
  _comeValue: any
  _headPointer: M9ComeI | null = null
  _tailPointer: M9ComeI | null = null

  // # _lastSeqInThisTaskLoop: number = 0 // ! 比较重要 - 当次任务循环中, 最后一个任务的序号, 用来决定这个序号之前的任务顺次执行, 之后的任务都不执行

  constructor ($firstComeValue: any = null) {
    this._comeValue = $firstComeValue
    this._headPointer = this._firstCome
    this._tailPointer = this._firstCome

    H_StrongMethodsInThisClass(this, ['$whisper', '$do', '$comeTrue'])
  }

  $whisper ($task: ComeTrueFnT) {
    const _t4is: this = this
    const m9Task: M9ComeI = {
      _no: this._taskSeq++,
      _value: null,
      // # 整套许愿还愿流程中 - 最关键的一步::连接本次与下次两个愿望的桥梁 - 并且用本轮许愿结果, 自动触发下轮许愿
      _task: function $task2 ($lastComeTrueResult: any) {
        const $comeTrue = ($currentComeTrueResult: any) => _t4is.$comeTrue($currentComeTrueResult, m9Task)
        return $task($lastComeTrueResult, $comeTrue)
      },
      _isDone: false,
      _next: null
    }
    // this._waitingTasks.set(m9Task._no, m9Task)
    this._tailPointer!._next = m9Task
    this._tailPointer = this._tailPointer!._next
    return this
  }

  $do () {
    this.$comeTrue(this._comeValue, this._headPointer!)
    // * 每次执行完一轮 愿望 流程后, 头指针移动到尾指针, 准备进行下一轮愿望的执行
    // this._headPointer = this._tailPointer
    return this
  }

  // ! 还愿方法
  $comeTrue ($yourResult: any, $currentCome: M9ComeI) {
    this._comeValue = $yourResult // # 这个是持续记录上一次许愿的结果, 有待优化, 感觉不用每次都记录, 这里用法可能有点问题, 太啰嗦了
    $currentCome._value = $yourResult
    // ! 继续实现下一个愿望 (用本次许愿成功的结果 -> 执行下一个还愿动作)
    const _nextCome = $currentCome._next
    _nextCome && _nextCome._task($yourResult)
  }
}

// const _whisper01 = new H_M9Whisper()

// _whisper01
// .$whisper((_firstComeValue, $ct) => {
//   setTimeout(() => { $ct((function (){console.log(1); return 1})()) }, 4000)
// })
// .$whisper((_1, $ct) => {
//   setTimeout(() => { $ct((function (){console.log(2 + _1); return 2 + _1})()) }, 5000)
// })
// .$whisper((_2, $ct) => { $ct((function (){console.log(3 + _2); return 3 + _2})()) })
// .$whisper((_3, $ct) => {
//   setTimeout(() => { $ct((function (){console.log(4 + _3); return 4 + _3})()) }, 3000)
// })
// .$whisper((_4, $ct) => {
//   setTimeout(() => { $ct((function (){console.log(5 + _4); return 5 + _4})()) }, 2000)
// })
// .$do()

// setTimeout(() => { console.log(1) }, 4000)
// setTimeout(() => { console.log(3) }, 5000)
// setTimeout(() => { console.log(2) }, 5000)
// setTimeout(() => { console.log(4) }, 3000)
// setTimeout(() => { console.log(5) }, 2000)

// _whisper01
// .$whisper((_firstCV, $ct) => {
//   $ct((function (){console.log(1); return 1})())
// })
// .$whisper((_1, $ct) => {
//   $ct((function (){console.log(2 + _1); return 2 + _1})())
// })
// .$whisper((_2, $ct) => { $ct((function (){console.log(3 + _2); return 3 + _2})()) })
// .$do()
// .$whisper((_3, $ct) => {
//   $ct((function (){console.log(4 + _3); return 4 + _3})())
// })
// .$whisper((_4, $ct) => {
//   $ct((function (){console.log(5 + _4); return 5 + _4})())
// })
// .$do()