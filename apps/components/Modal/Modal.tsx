import { PropType, Transition, defineComponent, nextTick, onBeforeMount, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import { HangRoot, M9Drag1nWindow, M9Dragger } from "@k1/utils"
import Button from "../Button/Button"
import M9Icon from '@k1/styles/assets/_'
// import { M9WebAdaptor } from "../Grid/Grid"
import OutlineX from "./OutlineX"
import { preCls, M9ModalProps, M9ModalState, M9DrawerProps } from "./controller"
import classNames from "classnames"

const getGlobalModalIdZIndex = (function () {
  let id = 0
  let zI = 0
  const default_zIndex = 999
  return function () {
    return {
      id: id++,
      zIndex: default_zIndex + (zI++)
    }
  }
})()

export default defineComponent({
  name: 'M9Modal',
  props: {
    modelValue: {
      type: Boolean as PropType<M9ModalProps['show']>,
      default: false
    },
    title: {
      type: [String, Object] as PropType<M9ModalProps['title']>
    },
    placement: {
      type: [String] as PropType<M9DrawerProps['placement']>,
      default: undefined
    }
  },
  emits: ['ok', 'close', 'update:modelValue'],
  setup(props, ctx) {
    const modalRef = ref<any>()
    const modalHeadRef = ref<any>()
    const m9DraggerRef = ref<any>()
    const outlineRef = ref<any>()

    // ? notify the organic outline that the modal geometry changed (drag/resize/zoom/show)
    function onNotifyOutlineRefresh() {
      outlineRef.value?.refresh()
    }

    const state = reactive<M9ModalState>({
      isShow: false,
      zoomValue: false
    })

    function onOk() {
      ctx.emit('ok')
      ctx.emit('update:modelValue', false)
    }

    function onClose() {
      state.isShow = false
      ctx.emit('close')
      ctx.emit('update:modelValue', false)
    }

    function onZoomChange() {
      if (mount_info.is_drawer) {
        return
      }

      state.zoomValue = !state.zoomValue

      m9DraggerRef.value.onNotifyUpdateState()
      onNotifyOutlineRefresh()
    }

    let destroyHeadDragHandler: Function = () => { }
    function dragModalHeaderHandler(el, offset, finalPosition) {
      if (!modalRef.value) return
      modalRef.value.style.left = `${finalPosition.left}px`
      modalRef.value.style.top = `${finalPosition.top}px`

      m9DraggerRef.value.onNotifyUpdateState()
      onNotifyOutlineRefresh()
    }
    function onDragModalHeader($modalHeadRef) {
      if (mount_info.is_drawer) {
        return
      }

      modalHeadRef.value = $modalHeadRef
      // ? 为弹框头部添加位移拖拽事件
      destroyHeadDragHandler = M9Drag1nWindow(modalHeadRef.value, dragModalHeaderHandler)
    }

    function onDragModalEndHandler(callbackDragArgs) {
      if (!modalRef.value) return
      const { nextWidth, nextHeight, nextLeft, nextTop } = callbackDragArgs

      modalRef.value.style.left = `${nextLeft}px`
      modalRef.value.style.top = `${nextTop}px`
      modalRef.value.style.width = `${nextWidth}px`
      modalRef.value.style.height = `${nextHeight}px`

      m9DraggerRef.value.onNotifyUpdateState()
      onNotifyOutlineRefresh()
    }

    // * 美九弹框组件内部 - 自动接收抽屉属性 -> 相关样式及逻辑, 自动锁定为抽屉样式和交互逻辑
    function M$CreateDrawer(_drawerPlacement: M9DrawerProps['placement']) {
      const placement = _drawerPlacement
      if (!placement) return

      mount_info.is_drawer = true
      if (placement === 'top') {

      } else if (placement === 'bottom') {

      } else if (placement === 'left') {

      } else if (placement === 'right') {

      }
    }

    onBeforeMount(() => {
      M$CreateDrawer(props.placement)
    })


    onMounted(() => {
      // ? 为弹框头部添加位移拖拽事件
      // destroyHeadDragHandler = M9Drag1nWindow(modalHeadRef.value, onHeadDragEvent)
    })

    onBeforeUnmount(() => {
      if (!mount_info.is_drawer) {
        destroyHeadDragHandler()
      }
    })

    var mount_info = {
      is_mount: false,
      is_drawer: false,
      id: 0,
      zIndex: 0
    }
    watch(() => props.modelValue, (show) => {
      state.isShow = show
      if (show) {
        if (!mount_info.is_mount) {
          const { id, zIndex } = getGlobalModalIdZIndex()
          mount_info.is_mount = true
          mount_info.id = id
          mount_info.zIndex = zIndex
        }
        nextTick(() => {
          m9DraggerRef.value.onNotifyUpdateState()
          onNotifyOutlineRefresh()
        })
      }
    })

    return { mount_info, m9DraggerRef, modalRef, modalHeadRef, outlineRef, state, onOk, onClose, onZoomChange, onDragModalHeader, onDragModalEndHandler }
  },
  render() {
    const {
      mount_info,
      state: { isShow, zoomValue },
      $props: { title, placement },
      onOk,
      onClose,
      onZoomChange,
      onDragModalHeader,
      onDragModalEndHandler
    } = this

    const modal_cls = classNames(preCls, {
      'is-drawer': !!placement,
      'fix-top': placement === 'top',
      'fix-bottom': placement === 'bottom',
      'fix-left': placement === 'left',
      'fix-right': placement === 'right',
    })

    const draggerDirectionProps = {
      isLeft: !placement || placement === 'right',
      isRight: !placement || placement === 'left',
      isBottom: !placement || placement === 'top',
      isTop: !placement || placement === 'bottom'
    }

    const children = this.$slots.default?.()

    // ! 这里发现组件重复渲染问题 - M9Dragger拖拽后, M9Dragger组件会重新渲染两次
    // ? 按说一次都不该渲染才对, 后续自行创造一个类似 useMemo 的组件缓存 HOC 吧
    // console.log('🚀 ~ render ~ mount_info:', mount_info)

    return (
      <HangRoot isOpen={isShow} isActive root-id={`m9-modal-bigRoot-${mount_info.id}`} style={{ background: '#0000008c', position: 'fixed', top: '0px', left: '0px', zIndex: mount_info.zIndex, width: '100%', height: '100%' }}>
        <Transition name={preCls}>
          <M9Dragger ref={(_draggerRef_: any) => this.m9DraggerRef = _draggerRef_} v-show={isShow} {...draggerDirectionProps} isAutoCalculate onDragend={onDragModalEndHandler} style={{ 'position': 'absolute', 'width': '100%', 'height': '100%', 'display': 'flex', 'justify-content': 'center', 'align-items': 'center' }}>
            <div className={modal_cls} ref={(_modalR_: any) => this.modalRef = _modalR_}>
              {/* organic outline canvas — covers the modal, stroke-only, no pointer events */}
              <OutlineX ref={(_outlineR_: any) => this.outlineRef = _outlineR_} getHost={() => this.modalRef} >
                <div className={`${preCls}__header`} ref={(_headR_: any) => onDragModalHeader(_headR_)}>
                  <div className={`${preCls}__header-title`}>{title}</div>
                  <div className={`${preCls}__header-rightbar`}>
                    {
                      // 这是个 放大 | 缩小 的功能图标按钮
                      !mount_info.is_drawer
                      && (zoomValue
                        && <M9Icon icon="zoom-in" onClick={onZoomChange} style="width: 1.5rem; height: 1.5rem; color: #c55cff;"></M9Icon>
                        || <M9Icon icon="zoom-out" onClick={onZoomChange} style="width: 1.5rem; height: 1.5rem; color: #c55cff;"></M9Icon>
                      )
                    }
                    <div style="width: 4px; background-color: #eee; margin: 0 0.5rem;"></div>
                    {
                      // 这是个 关闭弹框 的功能图标按钮
                      <M9Icon icon="close" onClick={onClose} style="width: 1.5rem; height: 1.5rem; color: #c55cff;"></M9Icon>
                    }
                  </div>
                </div>
                <div className={`${preCls}__body`}>
                  {children}
                </div>
                <div className={`${preCls}__footer`}>
                  <Button onClick={onOk}>确定</Button>
                  <div style="width: 2px; height: 1.5rem; background-color: #b8b8b8; margin: 0.5rem;"></div>
                  <Button onClick={onClose}>取消</Button>
                </div>
              </OutlineX>
            </div>
          </M9Dragger>
        </Transition>
      </HangRoot>
    )
  }
})