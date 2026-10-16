import { VNode } from 'vue'

export type PopPosition = 'top' | 'down' | 'left' | 'right'

export type PopMode = 'click' | 'hover'

/** Simple bounding rect shape decoupled from DOMRect */
export interface BoundRect {
  left: number
  top: number
  width: number
  height: number
}

/** A single point on a bezier trajectory */
export interface BezierPoint {
  x: number
  y: number
}

/** Options for the reusable fly bezier animation */
export interface FlyBezierOptions {
  /** Fly duration in ms */
  duration?: number
  /** CSS easing of the fly */
  easing?: string
  /** Horizontal wiggle size in px played twice on landing */
  wiggleSize?: number
  /** Starting scale, eases back to 1 during flight */
  scaleFrom?: number
}

/** The singleton dispatcher contract exposed as M9PopoverController */
export interface M9PopoverController {
  /**
   * Acquire the singleton pop slot before showing.
   * Returns the previous pop's rect (fromPop) when another pop is active,
   * so the caller can enter flight mode from the old position; otherwise null.
   */
  toPop: (instance: unknown, referEl: Element) => BoundRect | null
  /** Release the singleton pop slot on hide. Only the owner may release. */
  releasePop: (instance: unknown) => void
  /** Report the settled pop rect, captured as the next flight start point (fromPop). */
  keepLastPopRect: (rect: BoundRect) => void
  /**
   * Register a mounted managed refer in the live registry, reference
   * counted: while at least one refer is registered the single poper
   * is kept alive.
   */
  attachRefer: (referEl: Element) => void
  /**
   * Unregister a managed refer on unmount. When the LAST live refer
   * unregisters, the single poper is destroyed as well, closing the
   * create -> run -> end -> destroy cycle.
   */
  detachRefer: (referEl: Element) => void
  /**
   * Tear down the single poper completely: unmount the app, remove the
   * root node, reset all state. Auto-triggered on the last detachRefer;
   * the next show() lazily creates a fresh poper again.
   */
  destroy: () => void
}

export interface MPopoverProps {
  /**
   * Popover floating position [string] <default: top>
   */
  position?: string /** @see <|top<|-|>down<|-|>left<|-|>right<| */

  /**
   * Popover trigger mode [string] <default: click to open, click to close>
   */
  popMode?: string /** @see <|MP0PClick<|-|>MP0PHover<| */

  /**
   * Popover designated parent node [default: document]
   */
  parentNodeSetter?: (elementNode?: Node | null) => Element

  /**
   * External controlled visibility [boolean] <required>
   */
  showPop: boolean /** @see <|true-|==|-false|> */

  /**
   * Popover content [VNode] <required>
   */
  content: VNode

  /**
   * isPoperOne (default true): global singleton bubble mode - managed by
   * the singleton dispatcher. Only the refer (trigger) child renders here;
   * the visible pop bubble is the page-wide single poper instance created
   * by the dispatcher. false: standalone bubble, fully self-managed,
   * free from the controller. The dispatcher's own poper instance also
   * runs under isPoperOne=true, driven purely through injected props.
   */
  isPoperOne?: boolean

  /**
   * Callback fired when the pop is dismissed
   */
  onUnP0P?: () => void
}
