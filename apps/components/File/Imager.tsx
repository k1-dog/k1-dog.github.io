import { preCls as m9FilePreCls } from '.'
import M9Icon from '@k1/styles/assets/_'
import { M9Drag1nWindow } from '@k1/utils'

import Button from '../Button/index'
import { MImagerProps, MImagerState } from './Type'
import { reactive, PropType, defineComponent, getCurrentInstance, onMounted, ref, watch } from 'vue'

enum PREVIEW {
  wrapSize = 480
}

export default defineComponent({
  name: 'M9Imager',
  props: {
    src: {
      type: String as PropType<MImagerProps['src']>,
      default: ''
    },
    isShow: {
      type: Boolean as PropType<MImagerProps['isShow']>,
      default: false
    },
    width: {
      type: Number as PropType<MImagerProps['width']>,
      default: 100
    },
    height: {
      type: Number as PropType<MImagerProps['height']>,
      default: 100
    }
  },
  emits: ['showCallback', 'playOtherImageCallback'],
  setup (props, ctx) {
    const __defaultImagerArgs = {
      ratio: 1,
      angle: 0,
      width: 100,
      height: 100
    }
    const ActCode = {
      esc: 0,
      left: 1,
      right: 2,
      zoomin: 3,
      zoomout: 4,
      rotatein: 5,
      rotateout: 6,
      screen: 7
    }

    function  U$GetWH(
      ow: MImagerProps['width'],
      oh: MImagerProps['height']
    ): {
      width: MImagerState['width']
      height: MImagerState['height']
    } {
      if (!ow || !oh) {
        return {
          width: 0,
          height: 0
        }
      } else if (ow > oh) {
        // 宽大于高 -- 预览器 => 横向排布
        const _ratio_ = oh / ow
        const nw = PREVIEW.wrapSize
        const nh = nw * _ratio_
        return {
          width: nw,
          height: nh
        }
      } else {
        // 高大于宽 -- 预览器 => 纵向排布
        const _ratio_ = ow / oh
        const nh = PREVIEW.wrapSize
        const nw = nh * _ratio_
        return {
          width: nw,
          height: nh
        }
      }
    }

    const state = reactive<MImagerState>({ ...__defaultImagerArgs })

    watch(
      [
        () => props.width,
        () => props.height,
      ], (
        [
          newWidth, newHeight
        ]
      ) => {
        const { width: resetWidth, height: resetHeight } = U$GetWH(newWidth, newHeight)
        // state.ratio = 1
        // state.angle = 0
        state.width = resetWidth
        state.height = resetHeight
      })

    const vm = getCurrentInstance()
    let __self = null

    onMounted(() => {
      __self = (vm as any).ctx.$el
    })

    const onEsc = () => {
      ctx.emit('showCallback', false)
    }

    const onPrev = () => {
      ctx.emit('playOtherImageCallback', true)
    }

    const onNext = () => {
      ctx.emit('playOtherImageCallback', false)
    }

    const onZoom = (zoomCode: number) => {
      if (zoomCode === 1) {
        state.ratio = parseFloat((state.ratio * 1.1).toFixed(2))
      } else {
        state.ratio = parseFloat((state.ratio / 1.1).toFixed(2))
      }
    }

    const onRotate = (RotCode: number) => {
      if (RotCode === 1) {
        state.angle = state.angle + 90
      } else {
        state.angle = state.angle - 90
      }
    }

    const onScreen = () => {}

    const onHandleAction = (evt: Event) => {
      evt.stopPropagation()
      evt.preventDefault()

      let __parNode = evt.target as any
      while (__parNode != __self && !__parNode.dataset?.hasOwnProperty('v')) {
        __parNode = __parNode.parentNode
      }
      
      const { dataset: dataset$0 } = __parNode

      let _v_: string = dataset$0.v

      const code: number = parseInt(_v_)

      switch (code) {
        case ActCode.esc:
          onEsc()
          break

        case ActCode.left:
          onPrev()
          break

        case ActCode.right:
          onNext()
          break

        case ActCode.zoomin:
          onZoom(2)
          break

        case ActCode.zoomout:
          onZoom(1)
          break

        case ActCode.rotatein:
          onRotate(1)
          break

        case ActCode.rotateout:
          onRotate(2)
          break

        case ActCode.screen:
          onScreen()
          break

        default:
          break
      }
    }

    const mypreviewer = ref()
    function onDragImage (ImageEl: HTMLImageElement) {
      let _transition = null
      M9Drag1nWindow?.(
        ImageEl,
        (imgElement: HTMLDivElement, offset: object, finalPosition) => {
          const { left, top } = finalPosition
          imgElement.style.left = `${left}px`
          imgElement.style.top = `${top}px`
        },
        (imgElement) => {
          imgElement.style.transition = _transition
          _transition = null
        },
        (imgElement) => {
          _transition = imgElement.style.transition
          imgElement.style.transition = 'none'
        }
      )
    }

    return { ActCode, state, mypreviewer, onHandleAction, onDragImage }
  },
  render() {
    const preCls: string = `${m9FilePreCls}__preview`
    const { ActCode, onHandleAction, onDragImage } = this

    const { src, isShow } = this.$props

    const { width: _w_, height: _h_, ratio, angle } = this.state
    const width = `${_w_ * ratio}px`
    const height = `${_h_ * ratio}px`
    const previewImgStyle = {
      width,
      height,
      transform: `rotate(${angle}deg)`
    }

    return (
      <div className='miku-overlay' v-show={isShow}>
        <div className={preCls} onClick={onHandleAction}>
          <div
            ref={(el) => { onDragImage(this.mypreviewer = el) }}
            className={`${preCls}--img`}
            style={previewImgStyle}
          >
            <img
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '2em',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
              src={src}
              alt=''
            />
          </div>
          <div className={`${preCls}--close action`} data-v={ActCode.esc}>
            <Button type='pure' shape="circle" size="large"><M9Icon icon="close"></M9Icon></Button>
          </div>
          <div className={`${preCls}--left action`} data-v={ActCode.left}>
            <Button type='pure' shape="circle" size="large"><M9Icon icon="turn-prev"></M9Icon></Button>
          </div>
          <div className={`${preCls}--right action`} data-v={ActCode.right}>
            <Button type='pure' shape="circle" size="large"><M9Icon icon="turn-next"></M9Icon></Button>
          </div>
          <div className={`${preCls}--actionspanel`}>
            <div className='zoom_in action' data-v={ActCode.zoomin}>
              <Button type='pure' shape="circle" size="large"><M9Icon icon="zoom-in"></M9Icon></Button>
            </div>
            <div className='zoom_out action' data-v={ActCode.zoomout}>
              <Button type='pure' shape="circle" size="large"><M9Icon icon="zoom-out"></M9Icon></Button>
            </div>
            <div className='screen action' data-v={ActCode.screen}>
              <Button type='pure' shape="circle" size="large"><M9Icon icon="screen"></M9Icon></Button>
            </div>
            <div className='rotate_in action' data-v={ActCode.rotatein}>
              <Button type='pure' shape="circle" size="large"><M9Icon icon="left-rotate"></M9Icon></Button>
            </div>
            <div className='rotate_out action' data-v={ActCode.rotateout}>
              <Button type='pure' shape="circle" size="large"><M9Icon icon="right-rotate"></M9Icon></Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
})
