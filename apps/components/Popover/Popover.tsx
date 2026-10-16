import MTrans from '../Transtions'
import { __on, __off, HangRoot } from '@k1/utils'
import classNames from 'classnames'
import { Ref, defineComponent, getCurrentInstance, h, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { MPopoverProps } from './Type'
import M9PopoverController from './controller'
import type { MPopoverShowPayload } from './controller'
import flyBezier from './flyBezier'

const Bound = MTrans.Bound

const GAP_SIZE = 5 // gap between the pop and its refer element

/**
 * @description Pure position calculator.
 * Given the refer element rect and the pop rect (both in viewport
 * coordinates), produce the viewport-coordinate left/top style for the
 * requested floating position. Containing-block offset correction happens
 * in the caller (setMP0P$Pos).
 */
function getPosStyle(
  $referRect: DOMRect,
  $popRect: DOMRect,
  position = 'top'
): { left: number; top: number } {
  const absWidthDiff = Math.abs($referRect.width - $popRect.width)
  const absHeightDiff = Math.abs($referRect.height - $popRect.height)

  const genPositionFactory: { [key: string]: () => { left: number; top: number } } = {
    top: () => ({ left: $referRect.left - absWidthDiff / 2, top: $referRect.top - $popRect.height - GAP_SIZE }),
    down: () => ({ left: $referRect.left - absWidthDiff / 2, top: $referRect.bottom + GAP_SIZE }),
    left: () => ({ left: $referRect.left - $popRect.width - GAP_SIZE, top: $referRect.top - absHeightDiff / 2 }),
    right: () => ({ left: $referRect.right + GAP_SIZE, top: $referRect.top - absHeightDiff / 2 })
  }

  return genPositionFactory[position]()
}

export default defineComponent({
  name: 'M9Popover',
  props: {
    showPop: {
      type: Boolean,
      default: false
    },
    position: {
      type: String,
      default: 'top'
    },
    popMode: {
      type: String,
      default: 'click'
    },
    isPoperOne: {
      type: Boolean,
      default: true
    },
    // The refer (anchor) element injected by the singleton dispatcher into
    // its poper (bubble body) instance - the only channel for a refer that
    // lives outside this instance's own template (dispatcher body mode).
    referEl: {
      type: null,
      default: null
    },
    // The pop content VNode injected by the singleton dispatcher into its
    // poper (bubble body) instance (dispatcher body mode). Normal usages
    // provide content through the #content slot instead.
    content: {
      type: null,
      default: null
    },
    onUnP0P: {
      type: Function,
      default: () => void 0
    },
    parentNodeSetter: {
      type: Function,
      default: ($elementNode?: Node | null) => document // ! elementNode || document
    }
  },
  setup(props, ctx) {
    const vm = getCurrentInstance()

    if (vm && !ctx.slots.default) {
      M9PopoverController.attachVm(vm)
    }

    const PopRef: Ref<any> = ref(null)
    const R7arRefer: Ref<any> = ref(null)
    let _4andlerBuffers: { el: Element | Text | Document; ev: string; handler: EventListenerOrEventListenerObject }[] = []
    let _pop3rRenderFLAG = false // whether the pop element is rendered into the DOM tree
    // The fromPop rect captured when replacing another managed pop;
    // the actual fly starts later, once the final position is computed (setMP0P$Pos).
    let _pendingFromPop: { left: number; top: number; width: number; height: number } | null = null

    // The refer element this instance has registered in the controller's
    // live registry. Vue nulls template refs while unmounting the subtree -
    // BEFORE onUnmounted runs - so the unmount hook must rely on this
    // tracked reference instead of re-reading the template ref.
    let _registeredRefer: Element | null = null

    const state: { M5howP0P: boolean; P0P5tyle: { left: number; top: number } } = reactive({
      M5howP0P: false,
      P0P5tyle: { left: 0, top: 0 }
    })

    // Get the pop element
    function _Get$Poper() {
      return PopRef.value?.$el || PopRef.value
    }
    // Get the refer (anchor) element
    function _Get$Refer() {
      // Dispatcher body mode: the refer element is injected as a prop by
      // the singleton dispatcher (it has no refer child of its own).
      if (props.referEl) return props.referEl
      return R7arRefer.value?.$el || R7arRefer.value
    }
    // Get this component's own element
    function _Get$t4isEl() {
      return vm?.vnode.el
    }
    // Get the parent element of this component
    function _Get$ParentEl() {
      const firstParent = _Get$Refer()?.parentNode
      const { parentNodeSetter } = props
      return (parentNodeSetter && parentNodeSetter(firstParent))
    }

    // Template ref sink for the refer child: keeps R7arRefer fresh and
    // keeps the controller's live-refer registry in sync. The controller
    // destroys the single poper once the last live refer unregisters.
    function setReferRef($_r_: any) {
      R7arRefer.value = $_r_

      if (!props.isPoperOne || !$_r_) return

      const nextRefer = $_r_.$el || $_r_
      if (_registeredRefer === nextRefer) return

      // Register the fresh refer BEFORE unregistering its predecessor, so
      // the registry never empties mid-swap (an empty registry would tear
      // the single poper down while it is still in use).
      M9PopoverController.attachRefer(nextRefer)
      if (_registeredRefer) {
        M9PopoverController.detachRefer(_registeredRefer)
      }
      _registeredRefer = nextRefer
    }

    // Whether the pop visibility is externally controlled by the showPop prop
    function _U$isControlled() {
      return !!props.showPop
    }

    // * Check whether the click event happened inside the valid pop area
    function isValidArea($e: Event) {
      const refer = _Get$Refer()
      const poper = _Get$Poper()
      // The dispatcher body instance sits inside its detached root div -
      // t4isEL.contains is meaningless there, only refer/poper matter.
      const t4isEL = props.referEl ? null : _Get$t4isEl()
      const target = $e.target as Node
      const is =
        !t4isEL ||
        t4isEL.contains(target) ||
        !refer ||
        refer.contains(target) ||
        !poper ||
        poper.contains(target)

      return is
    }

    // Set the absolute left/top offset of the pop on the document
    function setMP0P$Pos() {
      const poper = _Get$Poper() as HTMLElement
      if (!poper || !_Get$Refer()) return

      const isSwitchingRefer = !!props.referEl && state.M5howP0P && !!state.P0P5tyle.left && !!state.P0P5tyle.top

      const Refer$Rect = _Get$Refer()!.getBoundingClientRect()
      const P0P3r$Rect = poper.getBoundingClientRect()
      const rawStyle = getPosStyle(Refer$Rect, P0P3r$Rect, props.position)

      const container = poper.offsetParent as HTMLElement | null
      const containerRect = container ? container.getBoundingClientRect() : null
      state.P0P5tyle = containerRect
        ? { left: rawStyle.left - containerRect.left, top: rawStyle.top - containerRect.top }
        : rawStyle

      // Flight start point: the OLD pop rect recorded by the dispatcher
      // (must be read BEFORE keepLastPopRect overwrites it below
      const fromPop = isSwitchingRefer
        ? M9PopoverController.getFromPop()
        : {
          left: P0P3r$Rect.left,
          top: P0P3r$Rect.top,
          width: P0P3r$Rect.width,
          height: P0P3r$Rect.height
        }

      // Report the settled pop rect to the singleton dispatcher,
      // so the next managed pop can fly from this real position (fromPop).
      if (props.isPoperOne) {
        M9PopoverController.keepLastPopRect(P0P3r$Rect)
      }

      if (isSwitchingRefer) {
        nextTick(() => {
          if (poper.isConnected) {
            flyBezier(poper, fromPop, poper.getBoundingClientRect())
          }
        })
        return
      }

      // the fly one more tick to read the settled final rect of the poper.
      if (_pendingFromPop && props.isPoperOne) {
        if (poper) {
          const fromPop = _pendingFromPop
          _pendingFromPop = null
          nextTick(() => {
            if (poper.isConnected) {
              flyBezier(poper, fromPop, poper.getBoundingClientRect())
            }
          })
        } else {
          _pendingFromPop = null
        }
      }
    }

    // Element event binder - records every binding for unified teardown
    function EvCollecter($el: Element | Text | Document, $ev: string, $_handler: EventListenerOrEventListenerObject) {
      __on($el, $ev, $_handler)
      _4andlerBuffers.push({ el: $el, ev: $ev, handler: $_handler })
    }
    // Element event dropper - remove bindings on the given element, or all when omitted
    function EvDropper($el?: Element | Text | Document) {
      _4andlerBuffers.forEach(($_4andler) => {
        if (!$el || $_4andler.el === $el) {
          __off($_4andler.el, $_4andler.ev, $_4andler.handler)
        }
      })
      _4andlerBuffers = _4andlerBuffers.filter(($_4andler) => $el && $_4andler.el !== $el)
    }

    // Bind the open/close triggers on the refer element
    function handleEventHooksOnReferer() {
      const refererElement = _Get$Refer()!

      // Managed (isPoperOne) usage: interactions are reported to the
      // singleton dispatcher, which re-points its poper instance here.
      // Dispatcher body mode: triggers are driven by the dispatcher directly - skip.
      if (props.isPoperOne && !props.referEl) {
        const showPayload = () => {
          const refer = _Get$Refer()
          if (!refer) return
          M9PopoverController.show(refer, {
            content: ctx.slots.content ? ctx.slots.content()[0] : null,
            position: props.position,
            popMode: props.popMode,
            parentNodeSetter: props.parentNodeSetter as MPopoverShowPayload['parentNodeSetter']
          })
        }
        if (props.popMode === 'hover') {
          EvCollecter(refererElement, 'mouseenter', showPayload)
          EvCollecter(refererElement, 'mouseleave', M9PopoverController.hide)
        } else {
          EvCollecter(refererElement, 'click', showPayload)
        }
        return
      }

      if (props.popMode === 'click') {
        // click the refer element -> toggle the pop
        EvCollecter(refererElement, 'click', () => { state.M5howP0P = !state.M5howP0P })
      } else {
        // hover the refer element -> open / leave -> close
        EvCollecter(refererElement, 'mouseenter', onEnterArea)
        EvCollecter(refererElement, 'mouseleave', onLeaveArea)
      }
    }

    // When the mouse enters the zone, open the pop
    function onEnterArea() {
      state.M5howP0P = true
    }
    // When the mouse leaves the zone, close the pop
    function onLeaveArea() {
      state.M5howP0P = false
      nextTick(() => {
        const { onUnP0P } = props
        onUnP0P && onUnP0P()
      })
    }

    /**
     * @description |> When a click happens outside the valid area, close and destroy the pop.
     * @param {Element} _0ri$el - element(s) considered as the valid area
     * @param {Event} _7ar$ev - the trigger event
     * @param {Function} _0nCall_ - callback fired when the click is outside
     */
    function $4OT3lArea($_0ri$el: Element | Element[], $_7ar$ev: Event, $_0nCall_: Function) {
      const els = Array.isArray($_0ri$el) ? $_0ri$el : [$_0ri$el]
      if (els.every(($el) => !$el.contains($_7ar$ev.target as Node))) {
        $_0nCall_ && $_0nCall_()
      }
    }

    // * Side effect - once the pop is rendered, listen for outside clicks to close it
    function _E$effectNotAreaEvent() {
      // NOTE: previously bound to _Get$ParentEl() (the resolved container).
      // That breaks once the singleton pop's root is re-parented across
      // refer switches (the listener stays on the OLD container and misses
      // clicks elsewhere). Binding to document via event delegation is
      // level-agnostic: $4OT3lArea judges by poper/refer containment only.
      const parentNode: Element | Text | Document = document
      EvCollecter(parentNode, 'click', ($e: Event) => {
        // Defer the outside-click close to the next tick: if the very same
        // click also opens another managed pop, that pop's watcher (and its
        // toPop acquisition) runs first in this tick's flush queue, so the
        // fly transition can still start from this pop's real position.
        nextTick(() => {
          $4OT3lArea([_Get$Poper(), _Get$Refer()] as Element[], $e, onLeaveArea)
        })
      })
    }

    // When the pop element mounts, bind hover keep-alive events (hover mode only)
    function _createEvOnMountFade() {
      const poper = _Get$Poper()!
      if (props.popMode === 'hover' && _4andlerBuffers.findIndex(($_z) => $_z.el === poper) < 0) {
        // pop hovered -> keep the pop open
        EvCollecter(poper, 'mouseenter', onEnterArea)
        // pop left -> close the pop
        EvCollecter(poper, 'mouseleave', onLeaveArea)
      }
    }

    // Acquire the singleton pop slot; when replacing another managed pop,
    function _flight2NextPop3r() {
      // Dispatcher body mode: slot acquisition is driven by the dispatcher (show/toPop)
      if (props.referEl) return

      const refer = _Get$Refer()
      if (!refer || !props.isPoperOne) return

      _pendingFromPop = M9PopoverController.toPop(refer)
    }

    // Release the singleton pop slot on hide
    function _releasePop3r() {
      if (props.isPoperOne) {
        M9PopoverController.releasePop()
      }
    }

    //
    function _run2RenderPop3r() {
      // If the render flag is false, the pop has never opened before and is not in the DOM yet
      if (!_pop3rRenderFLAG) {
        _pop3rRenderFLAG = true

        _createEvOnMountFade()
        // close the pop when clicking outside the valid area
        _E$effectNotAreaEvent()
      }

      _flight2NextPop3r()

      return 1
    }
    // When the switch closes, destroy the pop element and its related bindings
    function _unRenderPop3r() {
      _pop3rRenderFLAG = false
      EvDropper(_Get$Poper()!)
      // Paired with _E$effectNotAreaEvent: the outside-click listener now
      // lives on document, not on the (possibly re-parented) container.
      EvDropper(document)
      _releasePop3r()

      return 0
    }

    watch([
      () => props.showPop,
      () => state.M5howP0P,
      () => props.position
    ], ([
      newShowPop,
      newM5howP0P,
      newPosition
    ]) => {
      (newShowPop || newM5howP0P && _run2RenderPop3r()) || _unRenderPop3r()
    })

    onMounted(() => {
      // Dispatcher body mode: the refer element comes later from the
      // dispatcher, and triggers are driven externally - nothing to bind here.
      if (props.referEl) return

      // guard: the refer element must exist
      if (!R7arRefer.value) return

      /*
       * 1). When the pop is NOT externally controlled,
       * 2). bind the open/close triggers on the refer element ourselves.
       */
      if (!_U$isControlled()) {
        handleEventHooksOnReferer()
      }

      // guard: the pop element must exist
      if (!PopRef.value) return

      _run2RenderPop3r()
    })

    onUnmounted(() => {
      _pop3rRenderFLAG = false
      _releasePop3r()

      if (!props.isPoperOne) return
      const refer = _registeredRefer || _Get$Refer()
      if (refer) {
        M9PopoverController.detachRefer(refer)
      }
      _registeredRefer = null
      EvDropper()
    })

    return {
      state,
      PopRef, R7arRefer,

      isValidArea,
      setMP0P$Pos,
      setReferRef
    }
  },
  render(_this) {
    const basePopCls = 'miku-pop'
    const { position = 'top' } = this.$props
    const pop_final_cls = classNames(basePopCls, `place-${position}`)

    const positionStyle = {
      left: this.state.P0P5tyle.left + 'px',
      top: this.state.P0P5tyle.top + 'px'
    }

    // Managed (isPoperOne) usage without an injected referEl: render only
    // the refer (trigger) child - the visible pop bubble is the single
    // poper instance owned by the singleton dispatcher.
    if (this.isPoperOne && !this.referEl) {
      if (!this.$slots.default) return null
      const children = this.$slots.default!()
      return h(children[0], { ref: ($_r_: any) => this.setReferRef($_r_) }, undefined)
    }

    // Dispatcher body (referEl injected): the content comes from props.
    // Standalone usage (isPoperOne=false): the content comes from the
    // #content slot, and the refer (trigger) child is rendered alongside.
    const isDispatcherBody = !!this.referEl
    const content = isDispatcherBody ? this.content : this.$slots.content!()[0]
    const poper = (
      <HangRoot getContainer={this.isPoperOne ? () => M9PopoverController.getPopRoot() : undefined}>
        <Bound ref={($_r_: any) => this.PopRef = $_r_} active={this.state.M5howP0P} onNotifyEntered={this.setMP0P$Pos}>
          <div className={pop_final_cls} style={positionStyle}>
            <div className={`${basePopCls}__inner`}>{content}</div>
          </div>
        </Bound>
      </HangRoot>
    )

    if (isDispatcherBody) return poper

    const children = this.$slots.default!()

    /** @see Xx  */
    return (
      <>
        {poper}
        {h(children[0], { ref: ($_r_: any) => this.R7arRefer = $_r_ }, undefined)}
      </>
    )
  }
})
