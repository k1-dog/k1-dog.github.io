import { EmitsOptions, reactive, ref, Ref, SetupContext, watchEffect } from "vue"
import useZValidator from "./use-validate"
import { _TypeOf } from '@k1/utils'
import M9MsgX from '../Message/controller'
import { M9ZzFormHooksT, M9ZzFormState } from "./Type"


// ? eg. 泛型 F = 'name' | 'age' | 'power' | 'overlord'
export default function useZzFormHooks <ZzKeys0>() {
  const MikuFormHooks: M9ZzFormHooksT<ZzKeys0> = {
    _ctx: { attrs: {}, slots: {}, emit: () => void 0, expose: () => void 0 },
    _props: {},
    state: reactive({}),
    zv$: null,
    $toast: M9MsgX,
    $globalState: new Map,
    __isFirstMount: false,
    useSubmitted: function useSubmitted () {
      if (!MikuFormHooks.$globalState.has('useSubmitted')) {
        // * 创建 - 表单提交 _ RefImpl 对象
        const _state_isSubmitted = ref(false)
        MikuFormHooks.$globalState.set('useSubmitted', _state_isSubmitted)
      }
  
      const isSubmitted = MikuFormHooks.$globalState.get('useSubmitted')
  
      // * 创建 - 表单提交 _ 回调监听 函数
      const setSubmit = (isSubmit: boolean) => {
        isSubmitted.value = isSubmit
      }
      return [isSubmitted, setSubmit]
    },
    onSubmit: function onSubmit () {
      const [_, setSubmitted] = MikuFormHooks.useSubmitted()
      setSubmitted(true)

      const {
        zv$,
        $toast,
        state,
        _ctx
      } = MikuFormHooks
      
      // ! 折纸使用AST自卫队能力, 走查一遍自己管控之下的每个单元域, 值是否符合AST作战部队的法则, 不合法的话就提示
      const isFormValid = zv$.$__walk__()
      if (!isFormValid) {
        $toast.warning({ text: '折纸验证不通过, 请将信息填写完整！', life: 3000 })
        return;
      }
      $toast.success({ text: '折纸验证通过, 请继续操作！', life: 0 })
      const _FinalStateKeys = Object.keys(state) as Array<keyof ZzKeys0>
      const _FinalFormValue = _FinalStateKeys.reduce((Final, eachStateKey) => {
        Final[eachStateKey] = zv$[eachStateKey].value.$model
        return Final
      }, {} as { [key in keyof ZzKeys0]: any })
      _ctx.emit('final-value', _FinalFormValue)
    },
    _genStateAndRules: function _trans () {
      // * 如果 - 传入的表单选项域中, 存在初始值 value, 则该表单为编辑型表单, 需要初始化 state 表单状态
      const { _props: { formModel }, __isFirstMount, zv$ } = MikuFormHooks
      if (!formModel) {
        return void 0
      }
      const _state: M9ZzFormState<ZzKeys0> = {}
      
      for (const FieldKey in formModel) {
        const FieldOptions = formModel[FieldKey]
        const { key, value, required, type } = FieldOptions
        // ! 分割线类型的 域控件 _直接跳过
        if (type === 'DIVIDER') {
          continue
        }
         // * 初始化时, 初始值用 props 中的formModel每项的 value 去初始化;; 否则已经挂载过 -说明已生成折纸校验器, 则我们用zv$中每一个 -域 RefImpl- 的 -$model- 初始化
        const _Value = !__isFirstMount ? value : zv$[key]?.value.$model // !由于动态表单的原因 -zv$[key]可能未定义不存在, 所以加一个可选符?.
        const _IVType = _TypeOf(_Value)
        if (_IVType !== 'Undefined' && _IVType !== 'Null') {
          _state[key] = { initValue: _Value, isRequired: required }
        } else {
          _state[key] = { initValue: null || undefined, isRequired: required }
        }
      }
      MikuFormHooks.state = reactive(_state) as any
      if (!__isFirstMount) {
        // ! 标记挂载标识
        MikuFormHooks.__isFirstMount = true
      }
    },
    _genZV$Ctor: function _ZV$() {
      const {
        state,
        _props: { formRules: rules }
      } = MikuFormHooks
      
      const zv$ = useZValidator<typeof state>(state, rules)
      MikuFormHooks.zv$ = zv$
    },
    _EffectsWatcher: function (props) {
      let _stopWatch = watchEffect(() => {
        if (Object.keys(props).length === 0) {
          return
        }
        MikuFormHooks._props = { ...props }
        MikuFormHooks._genStateAndRules()
        MikuFormHooks._genZV$Ctor()
        MikuFormHooks._ctx.emit('emitZzController', MikuFormHooks.zv$)
      })
    },
    _mounted: function mounted () {
      // * 美九表单 挂载后 - 先行构造出 响应式的表单域状态 + v$表单控制器
    },
    _beforeMount: function beforeMount () {
    },
    _unmounted: function unmounted () {
      // ! 销毁 折纸表单的监听器 _stopWatch && _stopWatch()
    }
  }

  return MikuFormHooks
}