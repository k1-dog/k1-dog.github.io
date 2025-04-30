/**
 * @author Izayoi - Miku _ 诱宵美九助场
 * @author Origami - 鸢一折纸 大师 主场
 * @description 美九自设计 - 折纸ZZ表单验证器 [网上找的都是啥玩意儿啊 ~ 试了半天真难用, 还不如自己敲着简洁]
 */
import { computed, ComputedRef, ref, Ref } from "vue"
import { _TypeOf } from '@k1/utils'

// ? 鸢一折纸 的 表单验证器

// ? 系列检验规则
enum RULER {
  'required' = 'required', // * 必填 -校验
  'strLen' = 'strLen', // * 字符长度极限[min, max] -校验
  'numRan' = 'numRan', // * 数字大小极限[min, max] -校验
  'url' = 'url', // * 经典url -校验
  'date' = 'date', // * 日期格式 -校验
  'email' = 'email' // * 经典邮箱 -校验
}

// ? 每个检验员的执行函数类型
type onRulerE = () => boolean;

// * 定义 校验某个域后 _ , 生成的最终 校验结果参数类型
// ? 各个单元域 - 对应的检验员 [某些域无需校验 -> 则检验员可能为空], 携带自己掌握的校验规则, 生成的最终 校验结果参数类型
interface ZZVResultorT {
  // * 当前域 -最终的值
  $model: any;
  // * 校验员 -持有的校验函数类型 ['必填' | 'url' | '邮箱' | '字符长度最值' | '数字大小最值' | '日期时间']
  $ruleType?: keyof typeof RULER;
  // * 校验员 -不通过时 -提示信息 {被控属性 -由$invalid 的真假决定}
  $message?: string;
  // * 当前域 -是否通过校验规则 {被控属性 -$model 的值 -被onRuler 跟踪 -触发校验逻辑 -设置$invalid值}
  $invalid?: ComputedRef<boolean> | boolean;
  // * 设置 -当前域 -检验人 -校验函数 [计算属性] {被控回调 -trace 依赖跟踪$model 的值 -不断调用校验逻辑 -设置$invalid值}
  $onRuler?: onRulerE;
}

type ZZStateResultorsT<YR> = {
  [R in keyof YR]?: Ref<ZZVResultorT>;
}

// ! ~~~~important zv_$ - 最终的生成目标就是一个 - 响应式的计算属性 zv$
// # 包括 - 
// todo 1.__ 触发某一状态域 的校验逻辑 $touch: (stateName) => void;
// todo 2.__ 触发某一状态域 的重置-[值]-逻辑 $reset: (stateName) => void;
// todo 3.__ 触发某一状态域 的重置-[校验规则]-逻辑 $clear: (stateName) => void;
// todo 4.__ 触发全部状态域 的校验逻辑 $__walk__: () => void;
// todo 5.__ 是否安全通过校验 的计算属性 $security: computed(() => $__walk__());
// todo 6.__ 设置某一状态域 的-[值]-逻辑 $setStateValue: (stateName, stateValue) => void;
// ! zv_$ ~~~~important

export type ZZV0<ZVKeys0> = {
  $__walk__: () => boolean;
  $touch: (stateName: keyof ZVKeys0) => boolean;
  $reset: (stateName: keyof ZVKeys0) => void;
  $clear: (stateName: keyof ZVKeys0) => void;
  $setStateValue: (stateName: keyof ZVKeys0, stateValue: unknown) => void;
  // $security?: ComputedRef<boolean>;
} & ZZStateResultorsT<ZVKeys0>

type ZZFormStateT<ZVKeys1> = {
  [ZSK1 in keyof ZVKeys1]?: { initValue: any; isRequired: boolean; };
}

type ZZFormRulesT<ZVKeys2> = {
  [ZRK2 in keyof ZVKeys2]?: keyof typeof RULER;
}

// ? Y1 = 'name' | 'age' | 'power', Y1 表示 '鸢一' - 折纸大师
interface ZZValidatorPropsT<ZVKeysY1> {
  // * 表单相关 - 各域值对象
  $state: ZZFormStateT<ZVKeysY1>;
  // * 表单相关 - 规则校验对象
  $rules?: ZZFormRulesT<ZVKeysY1>;

  $Resultors: ZZStateResultorsT<ZVKeysY1>;
}

// * 检查对象 至少存在一个属性
function isHasData (_state: Object) {
  if (!_state) {
    return false
  }
  const _keysLen = Object.keys(_state)
  return _keysLen.length > 0
}

type ZValidatorT =
(<ZVKeys3>(state: ZZValidatorPropsT<ZVKeys3>['$state'], rules: ZZValidatorPropsT<ZVKeys3>['$rules']) => ZZV0<ZVKeys3> | null)
& Record<`ZV$_${RULER}`, (value: any) => boolean>;


// * 折纸表单验证器 - 构造器
const ZValidator: ZValidatorT = function ZValidator<ZVKEYS> (state: ZZValidatorPropsT<ZVKEYS>['$state'], rules: ZZValidatorPropsT<ZVKEYS>['$rules']) {
  var
    ZV$: ZZV0<ZVKEYS> | null = null,
    $state: ZZValidatorPropsT<ZVKEYS>['$state'] | null = null,
    $rules: ZZValidatorPropsT<ZVKEYS>['$rules'] | null = null,
    $Resultors: ZZStateResultorsT<ZVKEYS> | null = null

    function $touch (stateName: keyof ZVKEYS) {
      // * 没有 整体检验结果 或没有该域的校验对象 -> 直接通过
      if (!$Resultors || !$Resultors[stateName]) {
        return true
      }
      const stateResult = $Resultors[stateName]!.value
      const ruleType = stateResult.$ruleType
      
      console.log('@@@:: ', stateResult, stateResult.$ruleType, _TypeOf(ruleType))
      
      // * 没有规则类型的 表单域 -> 直接通过校验
      if (_TypeOf(ruleType) === 'undefined') {
        return true
      }
      // ? 当前域控件中 -填写的值 (待校验)
      const stateValue = stateResult.$model
    
      // ? 根据该域状态 锁定的校验规则 + 当前域值 -提取出校验规则函数 并执行校验
    
      const ruleHandler = ZValidator[`ZV$_${ruleType!}`]
      const isValid = ruleHandler && ruleHandler(stateValue)
      
      return isValid
    }

    function $__walk__ () {
      if (!$state) {
        return true
      }
      const ALLStateNames = Object.keys($state) as Array<keyof ZVKEYS>
      // ! 只要有一个 域值不满足规则检验 ->返回假 (Falsy)
      const AtLeastOne_NotPassed = ALLStateNames.some(stateName => !$touch(stateName))
      
      return !AtLeastOne_NotPassed
    }

    function initState (_state: ZZValidatorPropsT<ZVKEYS>['$state']) {
      $state = _state
    }

    function initRules (_rules: ZZValidatorPropsT<ZVKEYS>['$rules']) {
      $rules = _rules
    }
  
    function initResultors () {
      if (!$state) {
        $Resultors = null
        return
      }

      const __rules = $rules && { ...$rules } || {} as ZZValidatorPropsT<ZVKEYS>['$rules']
      const __state = { ...$state }
      
      const stateKeys = Object.keys($state) as Array<keyof ZVKEYS>

      const ruleValues = Object.keys(RULER)
      // ! 根据校验规则 -> 初始化生成 _校验结果对象
      const Resultors = stateKeys.reduce<ZZStateResultorsT<ZVKEYS>>((__Resultors, eachStateKey) => {
        // * 取出该表单域 -域名称
        const stateName = eachStateKey
        // * 该域是否需要被校验
        const isRequired = __state[stateName]?.isRequired
        // * 取出该表单域 -检验规则 .eg 比如我取出当前域的校验规则 为必填校验 'required'
        const currentStateRuleType = __rules?.[stateName]
        // * 取出 -该域的初始值 类型 -准备进行域初始值的 判空行为
        const _IVType = _TypeOf(__state[stateName]?.initValue)
        // * 取出该表单域 -域初始值
        const stateInitValue = (_IVType === 'undefined' || _IVType === 'null') ? null : __state[stateName]!.initValue
        // ! 当前域 1. 需要被 规则校验时 | 2. 规则类型存在时 | 3. 校验规则类型 处于-折纸验证器能接受的 规则范围时
        if (isRequired && !!currentStateRuleType && ruleValues.includes(currentStateRuleType!)) {
          // * 就可以 -创建这个 域的验证器对象
          __Resultors[stateName] = ref<ZZVResultorT>({
            $model: stateInitValue, // ? 响应式的 域值绑定
            $ruleType: currentStateRuleType, // ? 响应式的 域规则类型
            // ? 针对这一个域的 规则校验函数 -> 利用现在获取 得到的 域绑定值 + 域验证规则 -> 进行值的验证 -是否符合要求, 返回 布尔值
            $onRuler: () => {
              const isValid = $touch(stateName)
              return !isValid
            },
            // ? 创建 -这个域 响应式_的"是否无效"计算属性 -不断被 这个域内 onRuler 规则验证函数 执行更新
            $invalid: computed(() => __Resultors[stateName]!.value.$onRuler!()),
            $message: `${String(stateName)} is required`
          })
        } else {
          // ! 当前域规则 -不存在或者不符合要求时 _只需定义一个 响应双向绑定 RefImpl 值即可
          __Resultors[stateName] = ref<ZZVResultorT>({ $model: stateInitValue })
        }
        return __Resultors
      }, {})
      $Resultors = Resultors
    }

    // * 生成 ~ zv$ ~ 表单验证器
  function ZV () {
    if (!$Resultors) {
      return null
    }
    const _zv: ZZV0<ZVKEYS> = {
      $__walk__: $__walk__,
      $touch: $touch,
      $reset: function () {},
      $clear: function () {},
      $setStateValue: function (stateName, stateValue) {
        // ! 根据域名 -取出目标 -域校验对象
        const _targetStateModel = $Resultors![stateName]
        _targetStateModel!.value.$model = stateValue
      },
      ...$Resultors
    }
    return _zv
  }

  // * zv$ ~ 生成器 入口启动器
  function bootStrap (state: ZZValidatorPropsT<ZVKEYS>['$state'], rules: ZZValidatorPropsT<ZVKEYS>['$rules']) {
    if (!isHasData(state)) {
      return null
    }

    initState(state)
    initRules(rules)
    initResultors()

    const zv$ = ZV()

    return zv$
  }

  function __init__ () {
    return bootStrap(state, rules)
  }

  ZV$ = __init__()
  return ZV$
}

// * 必填校验 -工具函数
ZValidator.ZV$_required = function ZV$_required (value: any) {
  const isBool = () => true
  const isNotNull_Array = () => value.length > 0
  const isNotNull_Object = () => Object.keys(value).length > 0
  const isNotNull_BaseVar = () => typeof value === 'number' || !!value

  let valid = true
  const _TypeV_ = _TypeOf(value)
  
  if (_TypeV_ === 'boolean') {
    valid = isBool()
  } else if (_TypeV_ === 'array') {
    valid = isNotNull_Array()
  } else if (_TypeV_ === 'object') {
    valid = isNotNull_Object()
  } else {
    valid = isNotNull_BaseVar()
  }
  
  return valid
}
ZValidator.ZV$_strLen = function (value: any) { return true }
ZValidator.ZV$_numRan = function (value: any) { return true }
ZValidator.ZV$_url = function (value: any) { return true }
ZValidator.ZV$_date = function (value: any) { return true }
ZValidator.ZV$_email = function (value: any) { return true }

export default ZValidator