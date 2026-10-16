import { BoundRect, FlyBezierOptions, BezierPoint } from './Type'

/**
 * @description Cubic bezier point interpolation.
 * Computes a single point along a cubic bezier curve defined by
 * start point, end point and two control points at ratio t [0, 1].
 */
export function cubicBezierAt ($p0: BezierPoint, $p1: BezierPoint, $p2: BezierPoint, $p3: BezierPoint, $t: number): BezierPoint {
  const u = 1 - $t
  const uu = u * u
  const tt = $t * $t

  const x = uu * u * $p0.x + 3 * uu * $t * $p1.x + 3 * u * tt * $p2.x + tt * $t * $p3.x
  const y = uu * u * $p0.y + 3 * uu * $t * $p1.y + 3 * u * tt * $p2.y + tt * $t * $p3.y

  return { x, y }
}

/**
 * @description Build cubic bezier control points for a fly trajectory.
 * Control points are lifted upward on the Y axis so the flight path
 * draws a cute lively arc from fromPop to toPop.
 */
function buildArcControls ($fromPop: BoundRect, $toPop: BoundRect): [BezierPoint, BezierPoint] {
  const fromC = { x: $fromPop.left + $fromPop.width / 2, y: $fromPop.top + $fromPop.height / 2 }
  const toC = { x: $toPop.left + $toPop.width / 2, y: $toPop.top + $toPop.height / 2 }

  // Lift control points above the straight line to create an upward arc
  const lift = Math.min(120, Math.abs(toC.x - fromC.x) * 0.25 + 40)

  return [
    { x: fromC.x + (toC.x - fromC.x) * 0.25, y: fromC.y - lift },
    { x: fromC.x + (toC.x - fromC.x) * 0.75, y: toC.y - lift }
  ]
}
/**
 * @description Run a wiggle ending on the target element.
 * After the fly animation lands, the pop wiggles left and right quickly twice, then settles.
 */
function wiggleLanding ($el: HTMLElement, $wiggleSize: number): void {
  $el.animate(
    [
      { transform: 'translateX(0px)' },
      { transform: `translateX(${-$wiggleSize}px)` },
      { transform: `translateX(${$wiggleSize}px)` },
      { transform: `translateX(${-$wiggleSize * 0.6}px)` },
      { transform: `translateX(${$wiggleSize * 0.6}px)` },
      { transform: 'translateX(0px)' }
    ],
    { duration: 260, easing: 'ease-out' }
  )
}

/**
 * @description Fly a popover element from an old pop position (fromPop)
 * to a new pop position (toPop) like a swift drifting leaf:
 *
 * - launch fast, glide through the arc, then softly brake before landing
 * - the leaf banks (rotates) along the trajectory direction while flying
 * - on landing, a quick left-right wiggle is played twice, then it settles
 *
 * Reusable bezier fly animation - can be extended/reused by other components.
 */
export default function flyBezier ($el: HTMLElement, $fromPop: BoundRect, $toPop: BoundRect, $options?: FlyBezierOptions): Promise<void> {
  const {
    duration = 320,
    easing = 'cubic-bezier(.2,.75,.3,1)',
    wiggleSize = 6,
    scaleFrom = 0.9
  } = $options || {}

  // Guard: skip the fly when either rect contains non-finite values,
  // so NaN keyframes can never be generated.
  const isFiniteRect = ($r: BoundRect) => [$r.left, $r.top, $r.width, $r.height].every(Number.isFinite)
  if (!isFiniteRect($fromPop) || !isFiniteRect($toPop)) {
    return Promise.resolve()
  }

  return new Promise(($resolve) => {
    // The animated element's resting (base) position is the TARGET rect.
    // So visual offsets must be computed relative to the end point:
    // at t=0 the element appears at fromPop, at t=1 it rests at toPop (offset 0).
    const start = { x: $fromPop.left, y: $fromPop.top }
    const end = { x: $toPop.left, y: $toPop.top }
    const [c1, c2] = buildArcControls($fromPop, $toPop)

    // Sample the bezier curve into keyframes of translate offsets.
    // Dense sampling so the banking rotation reads smoothly.
    const steps = 24
    const keyframes: Keyframe[] = []
    let prev: BezierPoint | null = null
    for (let _i = 0; _i <= steps; _i++) {
      // Non-linear time mapping: fast launch (small t early), soft brake late.
      // t' = t^0.8 compresses the early phase -> snappier departure.
      const t = Math.pow(_i / steps, 0.8)
      const p = cubicBezierAt(start, c1, c2, end, t)

      // Leaf banking: rotate into the direction of travel, up to ~10deg,
      // straightening out as the leaf brakes and settles on landing.
      let rotate = 0
      if (prev) {
        const dx = p.x - prev.x
        const dy = p.y - prev.y
        const travel = Math.hypot(dx, dy)
        // bank sign follows horizontal direction, magnitude fades near landing
        const bank = Math.min(10, travel * 1.4) * (1 - t * t)
        rotate = dx >= 0 ? bank : -bank
      }

      keyframes.push({
        transform: `translate(${p.x - end.x}px, ${p.y - end.y}px) rotate(${rotate.toFixed(2)}deg) scale(${scaleFrom + (1 - scaleFrom) * t})`
      })
      prev = p
    }
    // Final frame rests exactly on the target position, flat and full size
    keyframes.push({ transform: 'translate(0px, 0px) rotate(0deg) scale(1)' })

    const animation = $el.animate(keyframes, { duration, easing, fill: 'none' })

    animation.onfinish = () => {
      wiggleLanding($el, wiggleSize)
      $resolve()
    }

    animation.oncancel = () => $resolve()
  })
}
