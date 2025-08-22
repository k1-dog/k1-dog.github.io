import { defineComponent, h } from "vue"
import useM9Dragger from './use-drag-hooks.client'


export default defineComponent({
  name: 'M9Dragger',
  props: {
    dragKey: [Number, String],
    isAutoCalculate: { type: Boolean, default: false },
    isLeft: { type: Boolean, default: false },
    isRight: { type: Boolean, default: false },
    isTop: { type: Boolean, default: false },
    isBottom: { type: Boolean, default: false }
  },
  emits: ['dragend'],
  setup (props, ctx) {
    const {
      childRef,
      leftDragRef, leftDraggerStyle,
      rightDragRef, rightDraggerStyle,
      topDragRef, topDraggerStyle,
      bottomDragRef, bottomDraggerStyle,
      onNotifyUpdateState
    } = useM9Dragger(props, ctx)

    return { childRef, onNotifyUpdateState, leftDragRef, leftDraggerStyle, rightDragRef, rightDraggerStyle, topDragRef, topDraggerStyle, bottomDragRef, bottomDraggerStyle }
  },
  render () {
    const {
      $props: { dragKey, isLeft, isRight, isTop, isBottom },
      $attrs: { style = {}, className },
      leftDraggerStyle, rightDraggerStyle, topDraggerStyle, bottomDraggerStyle
    } = this

    const childrenVnode = this.$slots.default!()

    return (
      <div className={className} style={{"position": "relative", ...style as object}}>
        {
          h(childrenVnode[0], { ref: ($_childR_: any) => this.childRef = $_childR_ }, undefined)
        }
        {
          isRight && <div className="m9-dragger right" style={{ ...rightDraggerStyle }} ref={($_rightDr_: any) => this.rightDragRef = $_rightDr_}></div>
        }
        {
          isLeft && <div className="m9-dragger left" style={{ ...leftDraggerStyle }} ref={($_leftDr_: any) => this.leftDragRef = $_leftDr_}></div>
        }
        {
          isTop && <div className="m9-dragger top" style={{ ...topDraggerStyle }} ref={($_topDr_: any) => this.topDragRef = $_topDr_}></div>
        }
        {
          isBottom && <div className="m9-dragger bottom" style={{ ...bottomDraggerStyle }} ref={($_bottomDr_: any) => this.bottomDragRef = $_bottomDr_}></div>
        }
      </div>
    )
  }
})