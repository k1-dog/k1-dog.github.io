import { App, createApp, nextTick, VNode } from 'vue'
import M9Popover from './Popover'

// .usage
// <m9-popover> usages with isPoperOne (default true) only render their refer
// (bubble body) instance created lazily here (createApp) and re-pointed to
// fromPop -> toPop flight simple. Usages with isPoperOne=true render their
//
// import { M9PopoverController } from '@k1/components/Popover/controller'
// M9PopoverController.show(vm, referEl, { content, position, popMode })

/** Payload passed from managed popover usages to the single poper */
export interface MPopoverShowPayload {
  content: VNode | (() => VNode)
  position?: string
  popMode?: string
  parentNodeSetter?: ($el?: Node) => Node | null
}

/**
 * @description Singleton dispatcher for the shared pop slot.
 *
 */
export default (function M9PopoverDispatcher () {
  // The controlled single poper app
  let _poperApp: App<Element> | null = null

  // The root DOM element the poper app is mounted on
  let _poperRoot: HTMLElement | null = null

  // The refer element the poper is currently attached to
  let _popRefer: Element | null = null

  // The last settled pop rect, used as the flight start point (fromPop)
  let _lastPopRect = { left: 0, top: 0, width: 0, height: 0 }

  // ! Epoch token for async concurrency control.
  // Every state mutation (show / hide / toPop / releasePop / destroy)
  // bumps the epoch. Deferred async steps (nextTick positioning, flight)
  // capture the epoch when scheduled and silently abort if it went stale,
  // so a late async callback can never act on an already-changed world.
  let _popEpoch = 0

  // ! Live managed refer registry - reference counting for the single poper.
  // Every mounted managed usage registers its refer element here and
  // unregisters on unmount; when the last one unregisters, the poper is
  // torn down completely - closing the create -> run -> end -> destroy cycle.
  const liveRefers = new Set<Element>()

  let _currentParentSetter: (($el?: Node | null) => Node | null) | null = null

  let _poperVm: any = null

  /**
   * @description Register the dispatcher body's internal instance (called
   * from the poper instance's own setup via getCurrentInstance()). The
   * internal instance carries the real shallowReactive props object -
   */
  function attachVm ($vm: unknown) {
    _poperVm = $vm
  }

  /**
   * @description Lazily create the single controlled poper (bubble body)
   * instance, mounted on document.body. Only ever called once.
   */
  function _ensurePoper () {
    if (_poperApp) return

    _poperRoot = document.createElement('div')
    document.body.appendChild(_poperRoot)

    _poperApp = createApp(M9Popover, {
      isPoperOne: true,
      referEl: null,
      content: null,
      position: 'top',
      popMode: 'click',
      showPop: false,
      parentNodeSetter: ($el?: Node | null) => (_currentParentSetter ? _currentParentSetter($el) : document)
    })
    _poperApp.mount(_poperRoot)
  }

  /**
   * @description Acquire the singleton pop slot before showing.
   * Returns the previous pop's rect (fromPop) when the slot was anchored
   * to a different refer, so the caller can enter flight mode.
   */
  function toPop ($referEl: Element) {
    // NOTE: DOMRect fields are prototype getters - spreading a DOMRect with
    // {...} yields an EMPTY object. Always copy fields explicitly.
    let _fromPop: { left: number; top: number; width: number; height: number } | null = null

    if (_popRefer && _popRefer !== $referEl) {
      _fromPop = {
        left: _lastPopRect.left,
        top: _lastPopRect.top,
        width: _lastPopRect.width,
        height: _lastPopRect.height
      }
    }

    _popRefer = $referEl
    _popEpoch++

    return _fromPop
  }

  /**
   * @description Capture the settled pop rect as the next flight start point.
   */
  function keepLastPopRect ($rect: { left: number; top: number; width: number; height: number }) {
    if (_popRefer) {
      // Explicit field copy - DOMRect spread would produce an empty object
      _lastPopRect = {
        left: $rect.left,
        top: $rect.top,
        width: $rect.width,
        height: $rect.height
      }
    }
  }

  /**
   * @description Snapshot the current settled pop rect (the flight start
   * point for the NEXT refer switch). Explicit field copy - DOMRect
   * spread would produce an empty object.
   */
  function getFromPop () {
    return {
      left: _lastPopRect.left,
      top: _lastPopRect.top,
      width: _lastPopRect.width,
      height: _lastPopRect.height
    }
  }

  /**
   * @description Expose the detached poper root (the HangRoot teleport
   * target for the dispatcher body instance). Guaranteed non-null once
   * the body has mounted - _ensurePoper() creates the root first.
   */
  function getPopRoot () {
    return _poperRoot
  }

  /**
   * @description Release the singleton pop slot on hide.
   */
  function releasePop () {
    _popRefer = null
    _popEpoch++
  }

  /**
   * @description Register a mounted managed refer in the live registry.
   * Paired with detachRefer: while at least one refer is registered,
   * the single poper is kept alive.
   */
  function attachRefer ($referEl: Element) {
    liveRefers.add($referEl)
  }

  /**
   * @description Centralized refer lifecycle management.
   * Called by managed usages when they unmount, so a destroyed refer can
   * never stay referenced as the active anchor (ghost anchor / leak).
   * When the LAST live refer unregisters, the single poper is destroyed
   * as well, closing the create -> run -> end -> destroy cycle; the next
   * show() lazily creates a fresh poper again.
   * All refer bookkeeping lives here in the controller - the usages
   * never touch _popRefer directly.
   */
  function detachRefer ($referEl: Element) {
    liveRefers.delete($referEl)

    if (_popRefer === $referEl) {
      _popRefer = null
      _popEpoch++
      // The currently anchored refer is gone - hide the pop too, so the
      // pop DOM never stays stranded inside the refer's unmounted subtree
      // (hide is idempotent: state off + clear refs + releasePop).
      hide()
    }

    // Last live managed refer is gone - tear the single poper down.
    // destroy() is idempotent, so an unpaired detach is a safe no-op.
    if (liveRefers.size === 0) {
      destroy()
    }
  }

  /**
   * @description Show the singleton pop attached to the given refer element.
   * Interacting with the same refer again toggles the pop closed.
   */
  function show ($referEl: Element, $payload: MPopoverShowPayload) {
    _ensurePoper()

    const $poper = _poperVm?.proxy
    if (!$poper) return

    // Guard: a refer that is no longer connected can never be anchored
    if (!$referEl.isConnected) return

    // Interacting with the same refer again toggles the pop closed
    if (_popRefer === $referEl && $poper.state.M5howP0P) {
      $poper.state.M5howP0P = false
      releasePop()
      return
    }

    const isSwitching = !!$poper.state.M5howP0P

    _currentParentSetter = $payload.parentNodeSetter ?? null
    if ($payload.parentNodeSetter && _poperRoot) {
      const container = $payload.parentNodeSetter($referEl)
      if (container instanceof Element && container !== _poperRoot.parentNode) {
        container.appendChild(_poperRoot)
      }
    }

    // Re-point the single poper to the new refer.
    // Driven through the internal instance's shallowReactive props object
    // (registered via attachVm): mutation triggers a re-render of the body.
    if (_poperVm) {
      Object.assign(_poperVm.props, {
        referEl: $referEl,
        content: $payload.content,
        position: $payload.position || 'top',
        popMode: $payload.popMode || 'click'
      })
    }

    // Acquire the slot (updates the tracked popRefer and bumps the epoch)
    toPop($referEl)

    if (isSwitching) {
      const epoch = _popEpoch
      nextTick(() => {
        // Stale guard: the world changed while we were waiting
        if (epoch !== _popEpoch || !_poperVm) return
        $poper.setMP0P$Pos()
      })
    } else {
      // First open: the watcher inside the poper runs _run2RenderPop3r,
      // Bound plays the enter animation, then setMP0P$Pos positions the pop.
      $poper.state.M5howP0P = true
    }
  }

  /**
   * @description Hide the singleton pop. Clears the content reference held
   * by the poper's props, so the hidden VNode tree can be GC'd.
   */
  function hide () {
    if (_poperVm?.proxy) {
      _poperVm.proxy.state.M5howP0P = false
      // Clear the reference held by the body's props, so the hidden
      // VNode tree / detached refer DOM subtree can be GC'd.
      _poperVm.props.content = null
      _poperVm.props.referEl = null
      // Drop the usage-scope closure captured by the last show() as well.
      _currentParentSetter = null
      releasePop()
    }
  }

  /**
   * @description Tear down the single poper completely:
   * Auto-triggered when the last live managed refer unmounts
   * (see detachRefer); also exposed for manual teardown.
   * The next show() lazily creates a fresh poper again.
   */
  function destroy () {
    releasePop()
    _currentParentSetter = null
    _poperVm = null
    if (_poperApp) {
      _poperApp.unmount()
      _poperApp = null
    }
    if (_poperRoot && _poperRoot.parentNode) {
      _poperRoot.parentNode.removeChild(_poperRoot)
    }
    _poperRoot = null
    _lastPopRect = { left: 0, top: 0, width: 0, height: 0 }
  }

  return {
    show,
    hide,
    toPop,
    releasePop,
    keepLastPopRect,
    getFromPop,
    getPopRoot,
    attachRefer,
    detachRefer,
    attachVm,
    destroy
  }
})()
