import classNames from "classnames";
import M9Icon from '../M9-Style/assets/_'
import { HangRoot } from "../M9-Utils/index"
import { M9MsgProps, M9MsgState } from "./Type";
import { Transition, PropType, defineComponent, getCurrentInstance, onBeforeUnmount, onMounted, reactive } from "vue";

// ! PS. 样式风格 - 参见 PrimeVue

export default defineComponent({
  name: 'M9Message',
  props: {
    type: {
      type: String as PropType<M9MsgProps['type']>,
      default: 'success'
    },
    text: {
      type: String as PropType<M9MsgProps['text']>,
      default: '这是一则消息'
    },
    life: {
      type: Number as PropType<M9MsgProps['life']>,
      default: 500
    },
    messageRoot: {
      type: Object,
      required: false
    }
  },
  emits: ['destroy'],
  setup (props, ctx) {
    const vm = getCurrentInstance()
    const state = reactive<M9MsgState>({ isShow: false })

    let _T800: NodeJS.Timeout | null | undefined

    function onClose ($life) {
      state.isShow = false
      
      if (_T800) {
        clearTimeout(_T800!)
        _T800 = null || undefined
      }

      _T800 = setTimeout(() => {
        clearTimeout(_T800!)
        _T800 = null || undefined
        ctx.emit('destroy', vm!.proxy)
      }, $life)
    }

    onMounted(() => {
      state.isShow = true
      // ? 组件 el 挂载到DOM上后, 立即弹出消息框自身, 并且延迟关闭自身
      props.life && onClose(props.life)
    })

    // ! 这里因为 消息组件生成的实例, 只要 isShow 状态关闭消息后, 它必然就永远不会再出现了
    // ! 所以想在 isShow = false 以后, 手动触发一个 vue3 组件实例的 销毁方法
    // ! 但是找了一圈, 发现只有 组件上层的 app, 貌似是个根组件 上才会找到一个 unmount 方法, 感觉很不靠谱
    // ? function onDestroy () { vm?.vnode.appContext?.app.unmount() }

    return { state, onClose }
  },
  render () {
    const {
      onClose,
      state: { isShow },
      $props: { type, text, messageRoot }
    } = this
    const _msgCls = classNames(
      'm9-msg',
      {
        [`m9-msg--${type}`]: type
      }
    )
    
    return (
      <HangRoot getContainer={messageRoot && (() => messageRoot)} >
        <Transition name="m9-msg">
        <div v-show={isShow} className={_msgCls}>
          <M9Icon icon={type} style="flex-grow: 0; width: 1rem; height: 1rem; margin-right: 0.5rem;"></M9Icon>
          <div className="m9-msg__text">{text}</div>
          <M9Icon icon="close" style="cursor: pointer; flex-grow: 0; width: 1.5rem; height: 1.5rem; margin-left: 0.5rem;" onClick={() => { onClose(0) }}></M9Icon>
        </div>
        </Transition>
      </HangRoot>
    )
  }
})