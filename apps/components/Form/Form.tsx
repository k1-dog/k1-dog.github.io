import { defineComponent, onBeforeMount, onMounted, onUnmounted, PropType, Ref, SetupContext } from 'vue'
import useZzFormHooks from './zz-hook'
import { M9InvalidT, M9ZzFieldT,  M9ZzFormHooksT, M9ZzFormPropsT } from './Type'
import M9Icon from '@k1/styles/assets/_'
import M9Input from '../Input/Input'
import M9Button from '../Button/Button'
import M9Switch from '../Switch/Switch'
import M9Select from '../Select/Select'
import M9Checkbox from '../CheckBox/CheckBox'
import M9DatePicker from '../DatePicker/index'
import classNames from 'classnames'

// * 组合复选框 VNode 生成器
const CheckboxGroupUI = function CheckboxGroupUI<FKEY10>(
  _ctx: SetupContext,
  FieldOptions: M9ZzFieldT<FKEY10>,
  FieldZV$: any,
  isSubmitted: M9InvalidT extends Ref<infer B> ? B : boolean
) {
  const { key: fieldName, label, required, options, replaceFields = { key: 'key', value: 'value' } } = FieldOptions
  if (!!!FieldZV$) {
    return null
  }

  const listeners = { onChange: () => { _ctx.emit('field-change', ...Array.from(arguments).slice(1)) } }

  return <M9Checkbox v-model={FieldZV$.$model} options={options} replaceFields={replaceFields} {...listeners}></M9Checkbox>
}

// * 输入框 VNode 生成器
const InputUI = function InputUI<FKEY3>(
  _ctx: SetupContext,
  FieldOptions: M9ZzFieldT<FKEY3>,
  FieldZV$: any,
  isSubmitted: M9InvalidT extends Ref<infer B> ? B : boolean
) {
  const { key: fieldName } = FieldOptions
  if (!!!FieldZV$) {
    return null
  }

  const listeners = { onChange: () => { _ctx.emit('field-change', ...Array.from(arguments).slice(1)) } }

  return <M9Input id={String(fieldName)} v-model={FieldZV$.$model} {...listeners} />
}

// * 选择框 VNode 生成器
const SelectUI = function SelectUI<FKEY4>(
  _ctx: SetupContext,
  FieldOptions: M9ZzFieldT<FKEY4>,
  FieldZV$: any,
  isSubmitted: M9InvalidT extends Ref<infer B> ? B : boolean
) {
  const {
    key: fieldName,
    options,
    isFilter,
    // filterMode = 'contains',
    isVirtual,
    isMulti = false,
    replaceFields = { value: 'value', label: 'label' }
  } = FieldOptions
  if (!!!FieldZV$) {
    return null
  }

  const virtualSConf = isVirtual
    ? {
        virtualScrollerOptions: { itemSize: 9 }
      }
    : {}
  
  const filterConf = isFilter
    ? {
        filterable: true,
        // filterMode: 'contains',
        onFilter: (searchingEvent: any) => {
          const { value: searchingText } = searchingEvent
          // ? 本来想监听筛选事件 -改善虚拟滚动下的筛选功能 -结果 GG 了
        }
      }
    : { filterable: false }

  const _changedHandler = (newV: any) => { _ctx.emit('field-change', ...Array.from(arguments).slice(1)) }

  const listeners = { onChange: _changedHandler }

  return <M9Select v-model={FieldZV$.$model} {...filterConf} {...virtualSConf} multiable={isMulti} options={options} replaceFields={replaceFields} {...listeners}>
    </M9Select>
}

// * 切换开关 VNode 生成器
const SwitcherUI = function SwitchUI<FKEY5>(
  _ctx: SetupContext,
  FieldOptions: M9ZzFieldT<FKEY5>,
  FieldZV$: any,
  isSubmitted: M9InvalidT extends Ref<infer B> ? B : boolean
) {
  const { key: fieldName, required, label } = FieldOptions
  if (!!!FieldZV$) {
    return null
  }

  const listeners = { onChange: (e: any) => { _ctx.emit('field-change', ...Array.from(arguments).slice(1)) } }

  return <M9Switch v-model={FieldZV$.$model} {...listeners} />
}

// * 文件上传 VNode 生成器
// const FilerUI = function FilerUI<FKEY7>(
//   _ctx: SetupContext,
//   FieldOptions: M9ZzFieldT<FKEY7>,
//   FieldZV$: any,
//   isSubmitted: M9InvalidT extends Ref<infer B> ? B : boolean
// ) {
//   const { key: fieldName, required, label, onUpload } = FieldOptions
//   if (!!!FieldZV$) {
//     return null
//   }

//   const Listeners = {
//     onSelect: (e: any) => {
//       FieldZV$.$model = e.files
//       _ctx.emit('field-change', ...Array.from(arguments).slice(1))
//     },
//     onUploader: (e: any) => {
//       _ctx.emit('field-change', ...Array.from(arguments).slice(1))
//       onUpload && onUpload(e)
//     },
//     onClear: () => {
//       _ctx.emit('field-change', ...Array.from(arguments).slice(1))
//       FieldZV$.$model = null
//     },
//     onRemove: (e: any) => {
//       const { file: removedFile, files: existedFiles } = e
//       FieldZV$.$model = existedFiles
//       _ctx.emit('field-change', ...Array.from(arguments).slice(1))
//     }
//   }

//   return (
//     <>
//       <M9FileUpload
//         name='file[]'
//         showUploadButton={false}
//         customUpload
//         multiple
//         accept='image/*'
//         maxFileSize={1000000}
//         {...Listeners}>
//         {{
//           content: (...a: any) => {
//             console.log(a);
//             return <p1>'Content'</p1>
//           },
//           empty: () => <p class={{ 'p-error': required && FieldZV$.$invalid && isSubmitted }}>请上传图片呦. *</p>
//         }}
//       </M9FileUpload>
//     </>
//   )
// }

// * 时间 VNode 生成器
const DateUI = function DateUI<FKEY8>(
  _ctx: SetupContext,
  FieldOptions: M9ZzFieldT<FKEY8>,
  FieldZV$: any,
  isSubmitted: M9InvalidT extends Ref<infer B> ? B : boolean
) {
  const { key: fieldName } = FieldOptions
  if (!FieldZV$) {
    return null
  }

  const _changedHandler = (newV: any) => { _ctx.emit('field-change', ...Array.from(arguments).slice(1)) }

  const listeners = {
    onDateSelect: _changedHandler,
    onClearClick: _changedHandler
  }

  return <M9DatePicker v-model={FieldZV$.$model} {...listeners} />
}

// * 分割线 VNode 生成器
const DividerUI = function DividerUI() {
  const divider_style = {
    "display": "block",
    "height": "2px",
    "width": "100%",
    "margin": "1rem 0",
    "background": "#e09bff"
  }
    
  return <div><div style={divider_style} /></div>
}

// * 表单单元域控件 生成器
const RenderFieldItem = function RenderFieldItem<FKEYS2>(
  _ctx: SetupContext,
  FieldOptions: M9ZzFieldT<FKEYS2>,
  zv$:  M9ZzFormHooksT<FKEYS2>['zv$'],
  isSubmitted: M9InvalidT extends Ref<infer B> ? B : boolean
) {
  const { key: FieldName, type, label, required, _class } = FieldOptions

  const FieldZV$ = zv$[FieldName].value

  let asyncFieldComponent = null

  if (type === 'IPT') {
    asyncFieldComponent = InputUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  } else if (type === 'SLT') {
    asyncFieldComponent = SelectUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  } else if (type === 'SWITCH') {
    asyncFieldComponent = SwitcherUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  } else if (type === 'TIME') {
    asyncFieldComponent = DateUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  } else if (type === 'FILE') {
    // asyncFieldComponent = FilerUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  } else if (type === 'CBOX-G') {
    asyncFieldComponent = CheckboxGroupUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  }

  const __class0 = `
    lg:col-${type === 'CBOX-G' ? '12' : '4'}
    md:col-${type === 'CBOX-G' ? '12' : '6'}
    sm:col-${type === 'CBOX-G' ? '12' : '12'}
  `

  const isError = FieldZV$.$invalid && isSubmitted

  const _errorFieldcls = classNames({ 'm9-field__required--invalid': isError })

  return asyncFieldComponent
    && (
      <div className={`m9-field ${!!_class ? _class : __class0} ${_errorFieldcls}`}>
        <h4 className='m9-field__label'>
          {label} {required && <span className='zz-dot'>*</span>}
        </h4>
        <div className="m9-field__component">
          {asyncFieldComponent}
        </div>
        { isError && <small className='m9-field__required--message'>{FieldZV$.$message}</small> }
      </div>
    ) || null
}

const UI = function UI<FKEYS1>(MFormHooks:  M9ZzFormHooksT<FKEYS1>) {
  const {
    onSubmit,
    zv$: zv$,
    _ctx,
    _props: { formModel },
    useSubmitted
  } = MFormHooks

  if (!formModel || !zv$) { return null }

  const FieldKeys = Object.keys(formModel) as Array<keyof FKEYS1>

  const [isSubmitted, _] = useSubmitted()

  const FormYieldUI = () =>
    FieldKeys.map((eachField, _fi) => {
      const FieldOptions = formModel[eachField]
      return FieldOptions.type === 'DIVIDER' ? DividerUI() : RenderFieldItem(_ctx, FieldOptions, zv$, isSubmitted.value)
    })

  const FormHeaderUI = () => (
    <>
      <h className="m9-form__header"><M9Icon icon="form" style="width: 2rem; height: 2rem;"></M9Icon></h>
    </>
  )

  const FormFooterUI = () => (
    <>
      <div className='m9-form__footer'>
        {/* // ! zv$.$security */}
        <M9Button onClick={onSubmit}>提交</M9Button>
        <div style="width: 2px; height: 1.5rem; background-color: #b8b8b8; margin: 0.5rem;"></div>
        <M9Button >重置</M9Button>
      </div>
    </>
  )

  return (
    <form className="m9-zz:form" onSubmit={(e) => { e && e.preventDefault() }}>
      {FormHeaderUI()}
      {/* {{ 'default': FormYieldUI }} */}
      {FormYieldUI()}
      {/* {{ 'default': FormFooterUI }} */}
      {FormFooterUI()}
    </form>
  )
}

const M9ZzFormConstructor = function ___<ZZKEYS>() {
  return defineComponent({
    name: 'ZzForm',
    props: {
      formModel: {
        type: Object as PropType<M9ZzFormPropsT<ZZKEYS>['formModel']>,
        required: true,
        default: () => ({})
      },
      formRules: {
        type: Object as PropType<M9ZzFormPropsT<ZZKEYS>['formRules']>,
        required: true,
        default: () => ({})
      }
    },
    setup(props: any, ctx) {
      const MFormHooks = useZzFormHooks<ZZKEYS>()
      MFormHooks._ctx = ctx

      MFormHooks._EffectsWatcher(props)

      onBeforeMount(MFormHooks._beforeMount)
      onMounted(MFormHooks._mounted)
      onUnmounted(MFormHooks._unmounted)

      return () => UI<ZZKEYS>(MFormHooks)
    }
  })
}

export default M9ZzFormConstructor()