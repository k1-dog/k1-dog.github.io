"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.H_M9Whisper = exports.H_StrongMethodsInThisClass = exports.H_M9CloneDeep = exports.isObject = exports._TypeOf = exports.H_isFunction = exports.H_M9UUID = exports.H_Trim = exports.numberOrZero = exports.valueOrDefault = exports._noop = void 0;
function _noop () { }
/**
 *
 * @param {函数上下文} $this
 * @param {待绑定函数} $methodNames
 * @param {待绑定参数} $arguments
 */
function H_StrongMethodsInThisClass ($this, $methodNames) {
  if ($methodNames === void 0) { $methodNames = []; }
  var $arguments = [];
  for (var _a = 2; _a < arguments.length; _a++) {
    $arguments[_a - 2] = arguments[_a];
  }
  $methodNames.forEach(function (methodName) {
    var _a;
    $this[methodName] && ($this[methodName] = (_a = $this[methodName]).bind.apply(_a, __spreadArray([$this], $arguments, false)));
  });
}
exports.H_StrongMethodsInThisClass = H_StrongMethodsInThisClass;
// * <许愿> - <还愿>
// ! 难点1: <许愿顺序维持> 每个愿望的先后顺序 如何维持
// ! 难点2: <还愿顺序同步> 由于某种原因, 还愿的顺序可能与许愿顺序不同步, 如何同步还愿顺序, 和许愿顺序对应一致
// ! 难点3(SSS): <> 必须等所有许愿动作都结束后, 再开始执行还愿动作
// ? .eg -> new M9Whisper().whisper(f1).whisper((r1, $ct) => $ct(f2(r1))).whisper((r2, $ct) => $ct(f3(r2))).do()
// ?    .whisper(('', $ct) => { setTimeout(() => { $ct(974) }) }).whisper((r3, $ct))
var H_M9Whisper = /** @class */ (function () {
  // # _lastSeqInThisTaskLoop: number = 0 // ! 比较重要 - 当次任务循环中, 最后一个任务的序号, 用来决定这个序号之前的任务顺次执行, 之后的任务都不执行
  function H_M9Whisper ($firstComeValue) {
    if ($firstComeValue === void 0) { $firstComeValue = null; }
    this._taskSeq = 0;
    // _waitingTasks: Map<M9ComeI['_no'], M9ComeI> = new Map()
    this._firstCome = { _no: '<Start>', _value: null, _task: _noop, _isDone: false, _next: null, _prev: {} };
    this._headPointer = null;
    this._tailPointer = null;
    this._comeValue = $firstComeValue;
    this._headPointer = this._firstCome;
    this._tailPointer = this._firstCome;
    H_StrongMethodsInThisClass(this, ['$whisper', '$do', '$comeTrue']);
  }
  H_M9Whisper.prototype.$whisper = function ($task) {
    var _t4is = this;
    var m9Task = {
      _no: this._taskSeq++,
      _value: null,
      // # 整套许愿还愿流程中 - 最关键的一步::连接本次与下次两个愿望的桥梁 - 并且用本轮许愿结果, 自动触发下轮许愿
      _task: function $task2 ($lastComeTrueResult) {
        var $comeTrue = function ($currentComeTrueResult) { return _t4is.$comeTrue($currentComeTrueResult, m9Task); };
        return $task($lastComeTrueResult, $comeTrue);
      },
      _isDone: false,
      _next: null,
      _prev: null,
      _isLoopAllEndFlag: null
    };
    // this._waitingTasks.set(m9Task._no, m9Task)
    // 尾插法 - 插入新节点
    this._tailPointer._next = m9Task;
    m9Task._prev = this._tailPointer; // 双向链表
    this._tailPointer = this._tailPointer._next;
    return this;
  };
  H_M9Whisper.prototype.$do = function () {
    this.$comeTrue(this._comeValue, this._headPointer);
    // * 每次执行完一轮 愿望 流程后, 头指针移动到尾指针, 准备进行下一轮愿望的执行 (顺便把之前的任务销毁节省开销, 后续实现)
    return this;
  };
  // ! 还愿方法
  H_M9Whisper.prototype.$comeTrue = function ($yourResult, $currentCome) {
    this._comeValue = $yourResult; // # 这个是持续记录上一次许愿的结果 感觉这里不加这行也行
    $currentCome._value = $yourResult;
    // ! 继续实现下一个愿望 (用本次许愿成功的结果 -> 执行下一个还愿动作)
    var _nextCome = $currentCome._next;
    const isLoopComeEnd = this.$isLoopTail(_nextCome)
    // ? 检测 - 是否已经还愿到<本轮>最后一个了, 本轮已经到末尾了,就抛出一个通知事件告诉 whisper 本轮全部还愿完成, 你可以进行其他事宜了
    if (isLoopComeEnd) {
      this.$notifyLoopFinish(isLoopComeEnd);
    } else if (_nextCome) {
      _nextCome._task($yourResult);
    }
  };
  // * 检测许愿池 - 是否到达池底(所有愿望均还愿成功)
  H_M9Whisper.prototype.$isLoopTail = function (Come) {
    return Come && Come._prev && Come._prev._isLoopAllEndFlag === true && Come || false;
  };
  // * 本轮愿望都还愿完成后, 抛出这样一个完成信号 - 并且接触限制锁(后续准备施加一个锁), 头指针逐步移动到尾指针
  // * 移动过程中挨个收集之前的还愿结果收录到一个结果集合中, 并准备当做 <下一轮whisper> 的许愿池启动参数
  H_M9Whisper.prototype.$notifyLoopFinish = function ($theLastCome) {
    var _tempLastLoopCTValues = [];

    while (this._headPointer._next !== $theLastCome) {
      this._headPointer._prev = null // 前向指针 置空
      this._headPointer = this._headPointer._next; // 头指针逐步移动
      _tempLastLoopCTValues.push(this._headPointer._value);
    }

    this._comeValue = _tempLastLoopCTValues; // 当轮 all 链子中的所有许愿结果暂存, 准备作用下一轮许愿池的启动参数

    this._headPointer = this._headPointer._next
    const _temp = this._headPointer
    this._headPointer._prev = null
    this._headPointer = this._firstCome
    this._headPointer._next = _temp
    this.$do() // 在all任务并行完成后, 自动执行下一轮许愿
  };
  H_M9Whisper.prototype.$setLoopAllEndFlag = function () {
    // 如果是通过 $all() 执行到了 $do(), 则在 $do 里边, 对尾愿进行一个本轮 all的结束标记 - 有特殊用处
    this._tailPointer._isLoopAllEndFlag = true
  }
  // * 愿望并行方法
  H_M9Whisper.prototype.$all = function (Comes) {
    var _this = this;
    Comes.forEach(function (come) {
      _this.$whisper(come);
    });
    this.$setLoopAllEndFlag()
    return this;
  };
  return H_M9Whisper;
}());
exports.H_M9Whisper = H_M9Whisper;
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
