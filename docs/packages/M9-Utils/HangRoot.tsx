
import { VNode, defineComponent, Teleport, onBeforeUnmount, watch, onBeforeMount } from 'vue'
/**
 * @see 将目标节点挂载与"document"文档中的"root"根节点上
 * @see 目的|>确保目标元素的定位坐标的正确性
 */

interface MRootHangProps {
  _container_$0?: Element

  shouldBooted?: boolean

  children?: VNode

  getContainer?: () => Element
}

interface MRootHangState {
  _container_: Element | undefined

  MOUNT_FLAG: boolean
}

/**
  * @see <React>中挂载节点最关键[也是最经典]的方法.=>.传送门.<portal-意为入口站点>
  * @see 次级方案可以考虑|>ReactDOM.render(<Modal>,a)
  * @param {* children *} ReactNodeList <待挂载的目标元素>
  * @param {* Container *} container <指定挂载的容器元素--此方法中已经指定为了"root"根元素>
  * @classRootHang
  * @extends {* React.Component *}
  */
const container$5tyle: { [k: string]: any } = {
  position: 'absolute',
  zIndex: '999',
  top: '0',
  left: '0',
  width: '100%',
  height: '0'
}

// 默认的容器创建
function selfContainer() {
  const el_$0__$container = document.createElement('div')
  document.body.appendChild(el_$0__$container)
  return el_$0__$container
}

export default defineComponent({
  name: 'M9HangRoot',
  props: {
    isOpen: {
      type: Boolean,
      default: true
    },
    // * 是否被外部组件控制
    isActive: {
      type: Boolean,
      default: false
    },
    getContainer: {
      type: Function,
      default: selfContainer
    }
  },
  setup(props, ctx) {
    const state: MRootHangState = { _container_: undefined, MOUNT_FLAG: false }

    function setStyles ($container) {
      const attrsExtraStyles = (ctx.attrs.style || {}) as object

      const finalStyles = { ...container$5tyle, ...attrsExtraStyles}

      const attrsStyleKeys = Object.keys(finalStyles)
      if (attrsStyleKeys.length > 0) {
        attrsStyleKeys.forEach(key => {
          $container.style[key] = finalStyles[key]
        })
      }
    }

    function setupContainer(): Element {
      const { getContainer } = props

      const attrsRootId = ctx.attrs.rootId

      const container = getContainer && getContainer()
      
      if (attrsRootId) { container.id = attrsRootId }

      setStyles(container)
      
      return container
    }

    function checkIsStyleRefresh ($container) {
      setStyles($container)
    }
  
    function removeContainer() {
      /** @see 一般先卸载节点中渲染出的组件----然后在从dom文档中移除节点元素 */
      /** @see 只能与-<*_ReactDOM.render_*>-配套使用 */
      // const unmountFlag = unmountComponentAtNode(RootHang._container_!);
      // if (unmountFlag && RootHang._container_?.parentNode) {
      //   RootHang._container_?.parentNode?.removeChild(RootHang._container_);
      // }
      /**@see 这里由于我渲染Root根容器元素时,没有使用-<*_ReactDOM.render_*>-,所以-<*_unmountComponentAtNode_*>-不能配套使用*/
      const { _container_: _container_$1 } = state
  
      if (_container_$1 && _container_$1?.parentNode) {
        _container_$1?.parentNode?.removeChild(_container_$1)
      }
    }

    onBeforeMount(() => {
      // hangRoot 组件挂载阶段, 标记 MOUNT_FLAG 为true
      state.MOUNT_FLAG = true
      state._container_ = setupContainer()
      if (props.isActive) {
        // ! 注意如果该 root 容器组件被外部组件控制, 那么挂载完成之后, 立即将 display 置空 - 先不显示在DOM上
        (state._container_ as any).style.display = 'none'
      }
    })

    onBeforeUnmount(() => {
      if (state.MOUNT_FLAG) {
        state.MOUNT_FLAG = false
        removeContainer()
      }
    })

    watch(() => props.isOpen, (isOpen) => {
      if (isOpen) {
        if (!state._container_) {
          state._container_ = setupContainer()
        } else {
          checkIsStyleRefresh(state._container_);
          (state._container_ as any).style.display = 'block'
        }
      } else {
        (state._container_ as any).style.display = 'none'
      }
    })

    return { state }
  },
  render () {
    const { _container_ } = this.state
    const children = this.$slots.default!()

    return (
      <Teleport to={_container_}>
        { children }
      </Teleport>
    )
  }
})