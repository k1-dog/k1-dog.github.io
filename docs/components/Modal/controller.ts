
// ! 用法示例
// 1. 引入 import M9Modal from '@kego/ys-ui'
// 2. 使用 <m9-modal title="弹框" v-model="show" @ok="onOk" @close="onClose"></m9-modal>

import { ComponentPublicInstance, VNode, createApp, defineComponent, getCurrentInstance, h, onBeforeMount, onBeforeUnmount, onMounted, ref } from "vue"
import M9Modal from './Modal'


export interface M9ModalProps {
  show: boolean // ? 弹框 外部 - 显隐状态值 - true -> 显示中 false -> 隐藏关闭中
  title: string | VNode
}

export interface M9ModalState {
  isShow: boolean // ? 弹框 显隐状态值 - true -> 显示中 false -> 隐藏关闭中
  zoomValue: boolean // ? 缩放状态值 - true -> 处于放大全屏状态 false -> 处于缩小窗口状态
}

// M9Modal 弹框组件内部 - 自动集成抽屉组件样式及相关逻辑
export interface M9DrawerProps {
  placement: 'top' | 'bottom' | 'left' | 'right' | undefined
}

export const preCls = 'miku-modal'

// ! 不出我所料, 连续生成弹框的话, z-index 层级果然有问题, 每次最新生成的弹框元素, 总是被压到最下面. 要开一个控制器去控制这些情况

function M9ModalController (this: any) {

  let modalInstancePool: Array<ComponentPublicInstance<typeof M9Modal>> = []

  const getGlobalIdZIndex = (function () {
    let id = 0
    let zI = 0
    let default_zIndex = 999
    return function () {
      return {
        id: id++,
        zIndex: default_zIndex + zI++
      }
    }
  })()

  function createModalApp (modalProps: M9ModalProps) {
    const _modalApp = createApp(M9Modal, {
      ...modalProps,
      onDestroy: destroyInstance
    })
  
    return _modalApp
  }

  function createModalInstance (modalProps: M9ModalProps, divContainer, children): [ComponentPublicInstance<typeof M9Modal>, number] {
    const { id, zIndex } = getGlobalIdZIndex()
  
    const modalApp = createModalApp(modalProps)
  
    const modalInstance: any = modalApp.mount(divContainer, children)
  
    modalInstance['m9_modalID'] = id

    return [modalInstance, zIndex]
  }

  function appendInstance ($modalInstance: ComponentPublicInstance<typeof M9Modal>) {
    modalInstancePool.push($modalInstance)
  }

  function destroyInstance ($willDeleteIns: ComponentPublicInstance<typeof M9Modal>) {
    const instanceIndex = modalInstancePool.findIndex(_ins => $willDeleteIns['m9_modalID'] === _ins['m9_modalID'])
    if (instanceIndex > -1) {
      const deletedIns = modalInstancePool.splice(instanceIndex, 1)[0]
      deletedIns?.$.appContext.app.unmount()
    }
  }
  
  function destroyAllIns () {
    modalInstancePool.forEach(_ins => { _ins?.$.appContext.app.unmount() })

    modalInstancePool.length = 0
  }

  // 扩展 - M9Modal 高阶组件
  const __m9_modal_controller_component__ = defineComponent({
    props: M9Modal.props,
    setup (props: M9ModalProps, ctx) {
      onBeforeMount(() => {
        modalInstancePool = []
      })
      
      onBeforeUnmount(() => {
        destroyAllIns()
      })

      const ins = ref()
      const vm = getCurrentInstance()
      onMounted(() => {
        const controller_El = vm?.vnode.el
        const childrenVNode = vm?.slots.default!()

        const [_modalIns, zIndex] = createModalInstance(props, controller_El, childrenVNode)
        console.log('🚀 ~ onMounted ~ _modalIns:', _modalIns, childrenVNode)
        controller_El!.style.zIndex = String(zIndex)
        appendInstance(_modalIns)

        ins.value = _modalIns.$el
      })

      return () => h('div', undefined, ins.value)
    }
  })

  return __m9_modal_controller_component__
}


export default M9ModalController