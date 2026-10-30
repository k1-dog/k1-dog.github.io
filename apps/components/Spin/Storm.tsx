import { ref, Ref, defineComponent, onMounted, onBeforeUnmount, watch } from "vue";
import className from 'classnames'
import { Tsukiyo, Shapes, rgba } from '../../tsukiyo'
import type { ITsukiyoLocator } from '../../tsukiyo/yomi'

// fixed-domain locator — the storm is a SCENE, not a scatter chart: x/y map
// a CONSTANT domain (never adaptive min/max), so the clouds (fixed y) never
// bob and no domain-pinning anchor data points are ever needed. the domain
// carries a margin so the wavy curtain/bolt samples (which run slightly past
// [0,1]) are never clamped onto an edge
const DOM_X0 = -0.15
const DOM_X1 = 1.15
const DOM_Y0 = 0
const DOM_Y1 = 1.05
const stormAxis = (): ITsukiyoLocator => ({
  // 归一化域 → 视口：x/y 是 Proj 纯函数（el, ctx, iX, iY）
  x: ($el, $ctx) => (($el.x - DOM_X0) / (DOM_X1 - DOM_X0)) * $ctx.w,
  y: ($el, $ctx) => $ctx.h - (($el.y - DOM_Y0) / (DOM_Y1 - DOM_Y0)) * $ctx.h,
  grid: 'none',                     // 过场动画不画坐标系
  init: { y0: false, zoom: 0.5 },   // zoom: small centered vignette
})

// lit-cloud glow — one arc circle big enough to wrap the cloud cluster,
// tinted by the bolt intensity (dual-track shape of the bolt origin row)

export default defineComponent({
  name: 'M9Storm',
  props: {
    spinning: {
      type: Boolean,
      default: true
    },
    text: {
      type: String,
      default: '加载中'
    }
  },
  setup(props) {
    const StormRef: Ref<any> = ref(null)
    const StormCanvasRef: Ref<any> = ref(null)
    const StormTextRef: Ref<any> = ref(null)

    // —— storm scene (engine workflow: chain links declared via the seal callback) ——

    const TAU = Math.PI * 2

    const CLOUD_COLOR = rgba(120, 136, 160, 235)
    const CLOUD_BAND = rgba(105, 122, 148, 255)
    const DROP_COLOR = rgba(90, 130, 200, 225)
    // (anchor colors are inlined in the anchor branch of stormPoint)

    const DROP_COUNT = 8            // sparse rain — fewer drops, calmer scene
    const BOLT_PERIOD = 2600        // ms per lightning cycle
    const BOLT_WINDOW = 1200         // ms visible per cycle (flicker envelope)

    // landing ripples — TWO staggered rings per drop, derived PURELY from
    // the drop's own phase p (the SAME clock that drives the fall): p
    // wrapping 1 -> 0 IS the landing instant, so u = p / RIPPLE_FRAC is
    // the ring progress starting exactly at the landing frame. zero new
    // state, zero timers, zero lifecycle bookkeeping.
    const RIPPLE_FRAC = 0.3        // ring lifetime as a fraction of the fall cycle
    const RIPPLE_DELAY = 0.08      // ring 2 lags ring 1 by 8% of the cycle
    const RIPPLE_ALPHA = 150       // peak stroke alpha (fades with (1-u)^2)

    // static drop seeds — phase / x / radius / speed fixed per drop;
    // plump heads (6..10.4px) so the teardrop stays stubby at any size
    const dropSeeds = Array.from({ length: DROP_COUNT }, ($_, $i) => ({
      x: ($i + 0.5) / DROP_COUNT + Math.sin($i * 12.9898) * 0.4 / DROP_COUNT,
      r: 6 + (($i * 37) % 5) * 1.1,                       // head radius 6..10.4
      speed: 0.45 + (($i * 53) % 4) * 0.07,                 // cycles/s 0.45..0.66
      phase: (($i * 97) % 11) / 11,                         // 0..1 stagger
    }))

    // clouds — a soft wavy OUTLINE (open Curve chain riding the cloud top,
    // never closed → never joins the closed-chain fill lane) + solid puff
    // circles underneath for the heavy body
    const cloudSeeds = [
      {
        x: 0.24, y: 0.9,
        puffs: [
          { dx: -0.05, dy: 0.004, r: 30 },
          { dx: -0.012, dy: -0.008, r: 40 },
          { dx: 0.03, dy: -0.004, r: 34 },
          { dx: 0.055, dy: 0.005, r: 26 },
        ],
        band: [
          { dx: -0.095, dy: 0.018 },
          { dx: -0.045, dy: -0.028 },
          { dx: 0, dy: -0.036 },
          { dx: 0.05, dy: -0.024 },
          { dx: 0.098, dy: 0.02 },
        ],
      },
      {
        x: 0.5, y: 0.92,
        puffs: [
          { dx: -0.06, dy: 0.005, r: 34 },
          { dx: -0.015, dy: -0.01, r: 46 },
          { dx: 0.035, dy: -0.005, r: 38 },
          { dx: 0.065, dy: 0.006, r: 28 },
        ],
        band: [
          { dx: -0.12, dy: 0.022 },
          { dx: -0.06, dy: -0.034 },
          { dx: 0, dy: -0.044 },
          { dx: 0.06, dy: -0.03 },
          { dx: 0.12, dy: 0.024 },
        ],
      },
      {
        x: 0.76, y: 0.9,
        puffs: [
          { dx: -0.045, dy: 0.004, r: 28 },
          { dx: -0.01, dy: -0.007, r: 38 },
          { dx: 0.028, dy: -0.004, r: 32 },
          { dx: 0.05, dy: 0.005, r: 24 },
        ],
        band: [
          { dx: -0.088, dy: 0.016 },
          { dx: -0.042, dy: -0.026 },
          { dx: 0, dy: -0.032 },
          { dx: 0.046, dy: -0.022 },
          { dx: 0.09, dy: 0.018 },
        ],
      },
    ]

    let _engine: { stop(): void, resize($w: number, $h: number): void, onFrame($cb: (() => void) | null): void } | null = null
    /** the scene runs on the ENGINE clock (frame hook) — no self-owned rAF */
    let _running = false
    let _t0 = 0
    // last measurable host viewport (frame geometry fallback — never window)
    let _lastViewW = 1000
    let _lastViewH = 800
    // last viewport pushed into engine.resize() (host re-layout tracking)
    let _lastEngineW = 0
    let _lastEngineH = 0

    // bolt zigzag knots (normalized data y: 1=top, 0=ground) — re-seeded per window
    let _boltKnots: Array<{ x: number, y: number }> = []
    let _lastWindowIdx = -1
    let _boltLitCloud = 0            // index of the cloud the bolt strikes from
    let _boltIntensity = 0           // current window flicker intensity (0 = off)
    // nearest drop index per cloud — recomputed every frame (curtain chain)
    let _nearest: number[] = [0, 0, 0]

    function seedBolt() {
      _boltKnots = []
      // strike origin rides one of the clouds — that cloud lights up
      _boltLitCloud = Math.floor(Math.random() * cloudSeeds.length)
      const origin = cloudSeeds[_boltLitCloud]
      let _kx = origin.x + (Math.random() - 0.5) * 0.06
      const yTop = origin.y - 0.04
      const steps = 5
      for (let _i = 0; _i <= steps; _i++) {
        const y = yTop - (_i / steps) * yTop
        _boltKnots.push({ x: _kx, y })
        _kx += (Math.random() - 0.5) * 0.05
      }
    }

    // per-frame physics → raw array → engine data re-pump; the ENGINE clock
    // drives this hook, so the scene never owns a clock of its own
    function frame() {
      const $now = performance.now()
      const t = ($now - _t0) / 1000
      const raw: any[] = []

      // drops — quadratic fall in data space (y: 1=top, 0=ground): y = 1 - p²;
      // flame tail = a CLOSED 3-segment teardrop outline (t0 base-right,
      // t1 tip, t2 base-left; base width = head diameter): two mirrored
      // convex bezier arcs (explicit cp1/cp2 in PIXEL coords, bypassing the
      // default normal-offset lift) + one straight base line, sealed by
      // stormRoad (t0 -> t1 -> t2 -> t0); the head circle nests at the base
      // viewport = the mask host rect (the .VPContent region); if the host
      // is not measurable this frame, keep the LAST known viewport — never
      // fall back to the window size (it would poison the geometry scale)
      const sizeNow = stormSize()
      if (sizeNow) {
        _lastViewW = sizeNow[0]
        _lastViewH = sizeNow[1]
        // the host can re-layout AFTER boot (syncRect pins it on the route
        // transition tick) — resize the engine so the canvas style.width
        // (written by retina) follows the host instead of a stale value
        if (sizeNow[0] !== _lastEngineW || sizeNow[1] !== _lastEngineH) {
          _lastEngineW = sizeNow[0]
          _lastEngineH = sizeNow[1]
          _engine?.resize(sizeNow[0], sizeNow[1])
        }
      }
      const viewW = _lastViewW
      const viewH = _lastViewH
      // pixel mappers — MUST mirror stormAxis EXACTLY (same domain [-0.15,1.15]x[0,1.05]):
      // cp pixel values are ABSOLUTE canvas coords consumed by bezier3ToCurve
      // verbatim, so any mismatch with the axis mapping tears the curve away
      // from its endpoints (the old nx*viewW linear map was off by 0.15/1.3)
      const px = ($nx: number) => (($nx - DOM_X0) / (DOM_X1 - DOM_X0)) * viewW
      const py = ($ny: number) => viewH - (($ny - DOM_Y0) / (DOM_Y1 - DOM_Y0)) * viewH

      // per-frame flame-head anchors: every drop's t0 (base-right point),
      // filled by the drop loop below and consumed by the curtain loop —
      // the single source of truth for the dynamic curtain bottom edge
      const dropT0: Array<{ x: number, y: number }> = []

      for (let _i = 0; _i < DROP_COUNT; _i++) {
        const s = dropSeeds[_i]
        const p = (t * s.speed + s.phase) % 1
        const fall = p * p
        const yHead = 1 - fall
        // whole drop (head + tail) narrows and stretches as it falls;
        // sin envelope keeps the shape CONTINUOUS across the p->0 wrap;
        // length is capped BOTH ways — never more than 3.2x the head
        // half-width (stubby teardrop) nor 3% of the screen height
        const shrink = 1 - 0.45 * Math.sin(Math.min(p, 1) * Math.PI)
        const rPix = s.r * shrink                // head half-width, pixels
        // floor 0.012 — early-fall teardrops never degrade into a bare line
        const v = Math.max(0.012, Math.min(2 * p * 0.05, (rPix * 3.2) / viewH, 0.03))
        // px() spans (DOM_X1 - DOM_X0) of the viewport, so a normalized-x
        // offset of rPix/viewW lands at rPix/(DOM_X1-DOM_X0) pixels on
        // screen — off by the domain ratio. Scale it so the base half-width
        // IS rPix pixels, matching the pixel-level control points below.
        const r = (rPix * (DOM_X1 - DOM_X0)) / viewW
        // flame base rides the TOP rim of the head circle (not the center
        // — the tail never overlaps the head it caps)
        const yBaseN = yHead + rPix / viewH      // normalized y (up = larger)
        const yTipN = yBaseN + v                 // tip above the base
        const vPix = py(yTipN) - py(yBaseN)      // tail length, pixels (<=0)
        const sid = `d${_i}`
        // base width in pixels, reused by the pixel-level control points
        const bx = px(s.x), byB = py(yBaseN)
        // right arc: base-right -> tip — concave inward (pixel cp, screen
        // width independent), cp slides from near-rim toward the axis
        raw.push({
          kind: 'trail', sid, part: 't0', x: s.x + r, y: yBaseN,
          cp1x: bx + rPix * 0.15, cp1y: byB + vPix * 0.45,
          cp2x: bx + rPix * 0.15, cp2y: byB + vPix * 0.75,
        })
        // left arc: tip -> base-left (mirror)
        raw.push({
          kind: 'trail', sid, part: 't1', x: s.x, y: yTipN,
          cp1x: bx - rPix * 0.15, cp1y: byB + vPix * 0.75,
          cp2x: bx - rPix * 0.15, cp2y: byB + vPix * 0.45,
        })
        // base arc: base-left -> base-right — the THIRD concave curve (bows
        // up toward the head), hopping back onto t0 via the chain link:
        // three concave curves chained into a CLOSED teardrop outline
        raw.push({
          kind: 'trail', sid, part: 't2', x: s.x - r, y: yBaseN,
          cp1x: px(s.x - r / 2), cp1y: byB + vPix * 0.18,
          cp2x: px(s.x + r / 2), cp2y: byB + vPix * 0.18,
        })
        // the head circle nests at the flame base (same shrink curve)
        raw.push({ kind: 'drop', sid, x: s.x, y: yHead, r: rPix })
        dropT0.push({ x: s.x + r, y: yBaseN })

        // landing ripples — two staggered HOLLOW rings riding the ground
        // line (y = 0, data-space bottom): progress u is a pure function
        // of p, so ring 1 is born the frame the drop lands (p wraps 1->0)
        // and ring 2 follows RIPPLE_DELAY of the cycle later; the ring
        // (Shapes.ring, arc ring mode) grows sqrt-ease-out from 0.6r to
        // 2r while its stroke fades out
        const ripple = ($u: number) => {
          const rGrow = s.r * (0.6 + 1.4 * Math.sqrt($u))
          const a = Math.round(RIPPLE_ALPHA * (1 - $u) * (1 - $u))
          return { r: rGrow, fill: rgba(140, 180, 235, a) }
        }
        if (p < RIPPLE_FRAC) {
          const { r, fill } = ripple(p / RIPPLE_FRAC)
          raw.push({ kind: 'ripple', sid: `rp${_i}`, x: s.x, y: 0, r, fill })
        }
        const p2 = (p + 1 - RIPPLE_DELAY) % 1
        if (p2 < RIPPLE_FRAC) {
          const { r, fill } = ripple(p2 / RIPPLE_FRAC)
          raw.push({ kind: 'ripple', sid: `rq${_i}`, x: s.x, y: 0, r, fill })
        }
      }

      // bolt window — flicker envelope: double-blink then a decaying tail
      const tIn = $now % BOLT_PERIOD
      const windowIdx = Math.floor($now / BOLT_PERIOD)
      let _boltOn = false
      if (tIn < BOLT_WINDOW) {
        if (windowIdx !== _lastWindowIdx) {
          _lastWindowIdx = windowIdx
          seedBolt()
        }
        const f = tIn / BOLT_WINDOW
        _boltIntensity = (Math.sin(f * Math.PI * 3) * 0.5 + 0.5) * (1 - f * 0.55)
        _boltOn = _boltIntensity > 0.12
      } else {
        _boltIntensity = 0
      }
      const lit = _boltOn ? _boltIntensity : 0

      // nearest drop index per cloud (by x distance) — the curtain bottom
      // rides exactly these three drops' flame heads; hoisted per frame
      // for the seal callback (chain topology is frame-stable)
      _nearest = cloudSeeds.map(($cs) => {
        let _best = 0, _bestD = Infinity
        for (let _d = 0; _d < dropSeeds.length; _d++) {
          const dd = Math.abs(dropSeeds[_d].x - $cs.x)
          if (dd < _bestD) { _bestD = dd; _best = _d }
        }
        return _best
      })

      // bolt FIRST — data order is z order: the glow halo rides UNDER the
      // cloud puffs (a halo on top reads as a white blob covering a cloud),
      // while the zigzag below the clouds stays fully visible
      if (_boltOn) {
        const boltFill = rgba(255, 240, 160, Math.round(255 * Math.max(0.35, _boltIntensity)))
        for (let _k = 0; _k < _boltKnots.length; _k++) {
          const knot = _boltKnots[_k]
          raw.push({
            kind: 'bolt', sid: 'bolt', part: `k${_k}`,
            x: knot.x, y: knot.y, boltFill,
            // first knot is dual-track: zigzag line + the glow halo
            glow: _k === 0 || undefined,
          })
        }
      }

      // the wrap-back return arc peaks ABOVE every cloud top — normalized y
      // grows UPWARD here, so "above" is max(y) + margin (min(y) − margin
      // would arc UNDER the clouds, cutting through the rain curtain);
      // the margin must beat the camera's content-area auto-fit (a small
      // raise just zooms the whole scene out and reads as "no change"),
      // and the cp x's spread BEYOND the outer clouds to widen the loop
      const wrapY = Math.max(...cloudSeeds.map(($c: any) => $c.y)) + 0.30

      /** shared hop control point — the band hop slot AND the curtain's
       * top-edge segment pass the SAME absolute cp, so the two curves
       * coincide exactly: the fill boundary rides under the band stroke
       * and never shows as a line of its own */
      const hopCp = ($p0: { x: number, y: number }, $p1: { x: number, y: number }): [number, number] => {
        const x0 = px($p0.x), y0 = py($p0.y)
        const w = px($p1.x) - x0, h = py($p1.y) - y0
        const n = Math.hypot(w, h) || 1
        const a = Math.min(n * 0.2, 18)
        return [x0 + w / 2 - (h / n) * a, y0 + h / 2 + (w / n) * a]
      }

      for (let _c = 0; _c < cloudSeeds.length; _c++) {
        const cs = cloudSeeds[_c]
        // clouds NEVER light up with the bolt — the flash is the glow disc
        // alone (a lit cloud mass reads as a whole-cloud flash, wrong)
        const puffFill = CLOUD_COLOR
        const bandFill = CLOUD_BAND
        for (const p of cs.puffs) {
          raw.push({ kind: 'cloud', sid: `cp${_c}`, x: cs.x + p.dx, y: cs.y + p.dy, r: p.r, fill: puffFill })
        }
        for (let _b = 0; _b < cs.band.length; _b++) {
          const bp = cs.band[_b]
          const last = _b === cs.band.length - 1
          // the LAST cloud's tail (b4) is the wrap-back onto cloud0's b0:
          // the default bend is a near-straight line straight across the
          // scene — instead give it explicit control points high ABOVE all
          // cloud tops → one large return arc enclosing the whole cloud band
          const isWrap = last && _c === cloudSeeds.length - 1
          // inter-cloud hop (this cloud's b4 -> the next cloud's b0): EXPLICIT
          // cp shared with the curtain's top-edge segment (same absolute cp →
          // the two curves coincide, the fill boundary hides under the stroke)
          const isHop = last && _c < cloudSeeds.length - 1
          const hop = isHop ? hopCp(
            { x: cs.x + bp.dx, y: cs.y + bp.dy },
            {
              x: cloudSeeds[_c + 1].x + cloudSeeds[_c + 1].band[0].dx,
              y: cloudSeeds[_c + 1].y + cloudSeeds[_c + 1].band[0].dy,
            },
          ) : null
          raw.push({
            kind: 'band', sid: `cb${_c}`, part: `b${_b}`,
            x: cs.x + bp.dx, y: cs.y + bp.dy,
            fill: bandFill,
            ...(hop ? { cp1x: hop[0], cp1y: hop[1], cp2x: hop[0], cp2y: hop[1] } : {}),
            ...(isWrap ? {
              cp1x: px(cs.x + 0.16), cp1y: py(wrapY),
              cp2x: px(cloudSeeds[0].x - 0.16), cp2y: py(wrapY),
            } : {}),
          })
        }
        // rain curtain — a TWO-CLOUD closed loop (the middle cloud stays
        // OUT of the sheet): cloud0 and cloud2 each connect to their own
        // nearest drop, the two drops link through ONE large-amplitude
        // sine wave, and the TOP edge mirrors the band chain from cloud2's
        // b4 back onto cloud0's b0 — the whole loop is FILLED (rain sheet):
        //   o0 (cloud0 b0 -> drop A) -> w0 (large sine A -> C)
        //   -> o2 (drop C -> cloud2 b4) -> t1..t5 (top edge) -> close
        if (_c === 0) {
          // o0 rides EXACTLY on cloud0's band b0 — the fill chain then
          // lands where the band strokes already are (no extra line)
          const b0p = { x: cs.x + cs.band[0].dx, y: cs.y + cs.band[0].dy }
          const a0 = dropT0[_nearest[0]]
          const clamp = ($n: number) => Math.max(-0.03, Math.min(0.03, $n))
          const dx = a0.x - b0p.x, dy = a0.y - b0p.y
          const nx = clamp(0.3 * dy), ny = clamp(-0.3 * dx)
          raw.push({
            kind: 'curtain', sid: `ct${_c}`, part: 'o0',
            x: b0p.x, y: b0p.y,
            fill: bandFill,
            cp1x: px(b0p.x + dx * 0.5 + nx),
            cp1y: py(b0p.y + dy * 0.5 + ny),
            cp2x: px(b0p.x + dx * 0.5 + nx),
            cp2y: py(b0p.y + dy * 0.5 + ny),
          })
        } else if (_c === 1) {
          // middle cloud — no dedicated arc segment: the main-chain wavy
          // bottom already rides its nearest drop (one continuous curtain)
        } else {
          // o2 climbs from drop C up to EXACTLY cloud2's band b4
          const b4p = { x: cs.x + cs.band[cs.band.length - 1].dx, y: cs.y + cs.band[cs.band.length - 1].dy }
          const a2 = dropT0[_nearest[2]]
          const clamp = ($n: number) => Math.max(-0.03, Math.min(0.03, $n))
          const dx = b4p.x - a2.x, dy = b4p.y - a2.y
          const nx = clamp(-0.3 * dy), ny = clamp(0.3 * dx)
          raw.push({
            kind: 'curtain', sid: `ct${_c}`, part: 'o2',
            x: a2.x, y: a2.y,
            fill: bandFill,
            cp1x: px(a2.x + dx * 0.5 + nx),
            cp1y: py(a2.y + dy * 0.5 + ny),
            cp2x: px(a2.x + dx * 0.5 + nx),
            cp2y: py(a2.y + dy * 0.5 + ny),
          })
          // top edge t1..t5 — mirrors the band chain from cloud2.b4 back to
          // cloud0.b0: STRAIGHT chords across the puff-covered bellies +
          // hop segments sharing the band hops' cp's (hopCp) → the fill
          // boundary rides UNDER the band strokes, never a line of its own;
          // the t5 tail lands exactly on o0's anchor → zero-length close
          const bAt = ($c: number, $i: number) => ({
            x: cloudSeeds[$c].x + cloudSeeds[$c].band[$i].dx,
            y: cloudSeeds[$c].y + cloudSeeds[$c].band[$i].dy,
          })
          const c2b4 = bAt(2, 4), c2b0 = bAt(2, 0)
          const c1b4 = bAt(1, 4), c1b0 = bAt(1, 0)
          const c0b4 = bAt(0, 4), c0b0 = bAt(0, 0)
          const seg = (
            $from: { x: number, y: number }, $to: { x: number, y: number },
            $cp: [number, number] | null, $part: string,
          ) => {
            raw.push({
              kind: 'curtain', sid: `ct${_c}`, part: $part,
              x: $from.x, y: $from.y,
              fill: null,
              cp1x: $cp ? $cp[0] : px(($from.x + $to.x) / 2),
              cp1y: $cp ? $cp[1] : py(($from.y + $to.y) / 2),
              cp2x: $cp ? $cp[0] : px(($from.x + $to.x) / 2),
              cp2y: $cp ? $cp[1] : py(($from.y + $to.y) / 2),
            })
          }
          seg(c2b4, c2b0, null, 't1')                          // cloud2 belly chord (puff-covered)
          seg(c2b0, c1b4, hopCp(c1b4, c2b0), 't2')             // hop2 reversed — shares the band hop's cp
          seg(c1b4, c1b0, null, 't3')                          // cloud1 belly chord (puff-covered)
          seg(c1b0, c0b4, hopCp(c0b4, c1b0), 't4')             // hop1 reversed — shares the band hop's cp
          seg(c0b4, c0b0, null, 't5')                          // cloud0 belly chord (puff-covered)
        }
      }

      // curtain bottom edge — ONE large-amplitude sampled SINE wave linking
      // the two drops (cloud0's nearest -> cloud2's nearest); its geometry
      // comes purely from the road Δ (the drop-to-drop chord), no cp needed
      {
        const from = dropT0[_nearest[0]]
        raw.push({
          kind: 'curtain', sid: 'cw', part: 'w0',
          x: from.x, y: from.y,
          fill: null,
        })
      }

      tsukiyoData(raw)
    }

    // rain-wave — the curtain bottom edge between the two drops: ONE AND A
    // HALF sine periods (sin(t·3π)) with a shrinking envelope — the first
    // period rides at full amplitude, the trailing half period softens to
    // ~45% (sin is zero at the t=2/3 seam, so the envelope stays smooth);
    // offsets ride the chord normal and the amp is capped in pixels so the
    // wave NEVER overshoots the side arcs (an overshooting bottom edge
    // self-intersects the closed loop and punches holes in the fill)
    const rainWave = Shapes.custom({
      kind: 'line', lineWidth: 1.5,
      slots: { amp: 0.14, cap: 26 },
      geo: ({ w, h, amp, cap }, $_o) => {
        const n = Math.hypot(w, h) || 1
        const [ux, uy] = [-h / n, w / n]
        const a = Math.min(n * amp, cap)
        const N = 36
        $_o.moveTo(0, 0)
        for (let _k = 1; _k <= N; _k++) {
          const t = _k / N
          const env = t <= 2 / 3 ? 1 : 0.45          // full 1st period, soft tail
          const off = Math.sin(t * Math.PI * 3) * a * env
          $_o.lineTo(w * t + ux * off, h * t + uy * off)
        }
      },
    })

    const stormPoint = ($el: any) => {
      if ($el.kind === 'drop') return Shapes.circle($el.r, DROP_COLOR)
      // landing ripple — a HOLLOW stroked ring on the ground line (arc ring
      // mode): no `part` field, so the seal callback never links it into
      // any chain (no fill-lane interference)
      if ($el.kind === 'ripple') return Shapes.ring($el.r, $el.fill)
      // explicit cp1/cp2 (pixel coords) — exact cubic bezier, no default lift
      if ($el.kind === 'trail') {
        return Shapes.curve(
          rgba(90, 130, 200, 130),
          [$el.cp1x, $el.cp1y], [$el.cp2x, $el.cp2y],
        )
      }
      // band — default bend between adjacent band points; the WRAP-BACK tail
      // (cloud2 b4 → cloud0 b0) carries explicit control points: one large
      // return arc peaking above all cloud tops (never a straight cut-across)
      if ($el.kind === 'band') {
        return $el.cp1x !== undefined
          ? Shapes.curve($el.fill, [$el.cp1x, $el.cp1y], [$el.cp2x, $el.cp2y])
          : Shapes.curve($el.fill)
      }
      // curtain — the sheet is painted by the ROAD fill (one closed contour);
      // the slots themselves are structural strokes:
      //   'w0'  the sine bottom edge — stroked, visible
      //   'o0'/'o2' the side arcs — stroked thin lines, visible
      //   't1'..'t5' the top edge — stroked with color 0 (fully transparent,
      //     invisible); they only shape the fill contour. A `fill: null`
      //     slot would stroke with css(NaN) — an INVALID style leaves the
      //     previous slot's color active → the "extra line" artifact
      if ($el.kind === 'curtain') {
        if ($el.part === 'w0') return rainWave({ amp: 0.14 }, CLOUD_BAND)
        if ($el.part[0] === 't') return Shapes.curve(0, [$el.cp1x, $el.cp1y], [$el.cp2x, $el.cp2y])
        return Shapes.curve($el.fill ?? CLOUD_BAND, [$el.cp1x, $el.cp1y], [$el.cp2x, $el.cp2y])
      }
      if ($el.kind === 'cloud') return Shapes.circle($el.r, $el.fill)
      // bolt — dual-track: zigzag line + (first knot only) the glow halo
      if ($el.kind === 'bolt' && $el.glow) {
        return [
          Shapes.line($el.boltFill),
          // glow halo — FIXED 64px disc (the flash reads as one clean
          // disc riding the strike origin; the clouds stay unlit)
          Shapes.arc(64, 0, TAU, rgba(255, 246, 200, Math.round(140 * _boltIntensity))),
        ]
      }
      if ($el.kind === 'bolt') return Shapes.line($el.boltFill)
    }

    // seal callback — pure semantic link rules, zero slot bookkeeping in the
    // frame loop: every chain link resolves its target by (sid, part) lookup
    // inside this callback. A slot index is rebuilt once per data re-pump
    // (detected by the model.raw reference change), then reused for the
    // whole pass — O(n) build, O(1) lookup per link.
    //   trail t_n -> t_{n+1} of the same drop; t4 -> t0 (flame close)
    //   band  b_n -> b_{n+1} of the same cloud; b4 -> the t0 of the drop
    //                nearest below this cloud (the rain curtain)
    //   bolt  k_n -> k_{n+1} (tail unlinked)
    let _sealIndex: Map<string, number> = new Map()
    let _sealIndexRaw: any = null
    const stormRoad = ($el: any, $i: number, $model: any) => {
      if ($el.part === undefined) return null
      // one-time index build per re-pump: "sid:part" -> SoA slot
      if ($model.raw !== _sealIndexRaw) {
        _sealIndexRaw = $model.raw
        _sealIndex = new Map()
        for (let _s = 0; _s < $model.count; _s++) {
          const e = $model.elements[$model.src[_s]]
          if (e && e.sid !== undefined && e.part !== undefined) _sealIndex.set(`${e.sid}:${e.part}`, _s)
        }
      }
      const [tag, num] = [$el.sid, Number($el.part.slice(1))]
      if ($el.kind === 'trail') {
        // Δloop:false — flame tails stay STROKE-ONLY (the fill underlay is
        // reserved for the cloud slabs); a filled teardrop would also hide
        // the drop head circle beneath it
        if (num < 2) {
          // right half then left half of the teardrop
          return { Δi: _sealIndex.get(`${tag}:t${num + 1}`) ?? -1, Δloop: false }
        }
        // t2 tail — the third concave arc hops back onto t0: three concave
        // curves chained into a CLOSED teardrop (per-slot stroke chain)
        return { Δi: _sealIndex.get(`${tag}:t0`) ?? -1, Δloop: false }
      }
      if ($el.kind === 'band') {
        // ONE continuous wavy outline riding all three clouds: b0..b4 per
        // cloud, each tail hops onto the NEXT cloud's b0 — and the LAST
        // cloud wraps back onto the FIRST (closed loop, cloud0 b0).
        // Δloop:false — stroke only: the loop never joins the closed fill
        // lane (filling it would smear a slab across the whole screen)
        if (num < 4) return { Δi: _sealIndex.get(`${tag}:b${num + 1}`) ?? -1, Δloop: false }
        const cloudIdx = Number(tag.slice(2))
        const nextCloud = (cloudIdx + 1) % cloudSeeds.length
        return { Δi: _sealIndex.get(`cb${nextCloud}:b0`) ?? -1, Δloop: false }
      }
      if ($el.kind === 'curtain') {
        // main curtain chain (two-cloud closed loop): cloud0 b0 'o0'
        // -> large sine 'w0' (drop A -> drop C) -> 'o2' (up to cloud2 b4)
        // -> top edge t1..t5 (band-mirrored) — FILLED (the full rain sheet)
        if ($el.sid === 'ct0' && $el.part === 'o0') {
          return { Δi: _sealIndex.get('cw:w0') ?? -1, fill: rgba(60, 72, 92, 235) }
        }
        if ($el.sid === 'cw') {
          // the single bottom wave hops onto cloud2's outer arc
          return { Δi: _sealIndex.get('ct2:o2') ?? -1 }
        }
        if ($el.sid === 'ct2' && $el.part === 'o2') {
          // o2 rides onto the top-edge chain (t1..t5 mirrors the band)
          return { Δi: _sealIndex.get('ct2:t1') ?? -1 }
        }
        if ($el.sid === 'ct2' && $el.part.length === 2 && $el.part[0] === 't') {
          // t1..t4 chain forward; the t5 tail lands exactly on o0's anchor
          // (cloud0's b0) → a zero-length closePath, no seam line
          const k = Number($el.part[1])
          return k >= 5 ? { Δi: -1 } : { Δi: _sealIndex.get(`ct2:t${k + 1}`) ?? -1 }
        }
        return null
      }
      if ($el.kind === 'bolt') {
        const next = `k${num + 1}`
        const ti = _sealIndex.get(`bolt:${next}`)
        // Δloop:false — the zigzag strokes only, never joins the closed
        // fill lane (a filled zigzag ribbon would cut across the curtains)
        return ti === undefined ? null : { Δi: ti, Δloop: false }
      }
      return null
    }

    // raw → tsukiyo (pumped per-frame via the engine data channel; frame
    // only runs once the engine exists, no pre-mount buffering needed)
    let _tsukiyo: any = null
    const DIM = { dimX: 'sid', dimY: ['y'] }
    function tsukiyoData($raw: any[]) {
      _tsukiyo?.data($raw, DIM)
    }

    function stormSize(): [number, number] | null {
      // derive from the HOST (100% reliable layout): the scene canvas is a
      // full-bleed inset:0 box, so the scene box = the host box. NEVER
      // self-read the canvas: the engine resize writes inline width/height
      // into it, which would feed its own stale value back into resize
      const host = StormRef.value
      const w = host?.clientWidth ?? 0
      const h = host?.clientHeight ?? 0
      if (w <= 0 || h <= 0) return null
      return [w, h]
    }

    function startStorm() {
      if (_running || !_engine) return
      _running = true
      _t0 = performance.now()
      _engine.onFrame(frame)
    }
    function stopStorm() {
      if (!_running) return
      _running = false
      _engine?.onFrame(null)
    }

    function onResize() {
      const size = stormSize()
      if (size) _engine?.resize(size[0], size[1])
    }

    function anchorAxis() {
      const { init, ...axis } = stormAxis()
      return init?.y0 === false ? { ...axis, init: { y0: false } } : axis
    }

    onMounted(async () => {
      if (import.meta.env.SSR) return
      if (StormCanvasRef.value) {
        _tsukiyo = new Tsukiyo(StormCanvasRef.value)
          .scale(DIM)
          .coord(stormAxis())
          .shape(stormPoint)
          .paths(stormRoad)
          .anim('snap')   // per-frame data re-pump — skip the grow channel
          // layering layer — the four corner pin studs (pure decoration,
          // own sub-engine on a canvas above the main one, z:2); passing
          // the callback also REPLACES the default grid background layer
          .layering(() => ({
            layers: [{
              z: 2,
              // host-glued — the stud frame keeps the HOST edges (outer
              // tier) no matter how the main storm canvas insets (inner
              // tier); the main resize cascade skips this layer entirely
              size: 'host' as const,
              // anchor coordinates ride the storm NORMALIZED domain (x/y
              // 0..1) — NOT the nx/ny pixel expansion (the axis projects
              // the 0..1 domain itself)
              input: [
                { kind: 'anchor', part: 'tl', x: 0.04, y: 0.94 },
                { kind: 'anchor', part: 'tr', x: 0.96, y: 0.94 },
                { kind: 'anchor', part: 'bl', x: 0.04, y: 0.06 },
                { kind: 'anchor', part: 'br', x: 0.96, y: 0.06 },
              ],
              // corner pin stud — two concentric circles with a raised
              // relief: outer plate ring, dark under-shadow, bright body,
              // offset highlight dot (the inner disc pops out of the screen)
              shape: ($el: any) => [
                Shapes.circle(11, rgba(120, 145, 185, 90)),     // outer plate ring
                Shapes.circle(6, rgba(40, 60, 100, 140)),       // under-shadow
                Shapes.circle(6, rgba(130, 160, 210, 235)),     // raised body
                Shapes.circle(2.2, rgba(235, 245, 255, 220)),   // top-left highlight
              ],
              coord: anchorAxis(),
            }],
          }))
        _engine = await _tsukiyo.draw()
        // curtain chain fill color is declared inside stormRoad (SealConf.fill)
        if (props.spinning) startStorm()
        window.addEventListener('resize', onResize)
      }
    })

    watch(() => props.spinning, ($isLoading) => {
      if ($isLoading) startStorm()
      else stopStorm()
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', onResize)
      _engine?.onFrame(null)
      _engine?.stop()
    })

    return {
      StormRef, StormCanvasRef, StormTextRef
    }
  },
  render() {
    const {
      $props: { spinning, text },
      $attrs: { style = {} }
    } = this

    const baseStormCls = 'miku-storm'
    const storm_cls = className(baseStormCls)

    return (
      <div v-show={spinning} ref={($_r_: any) => this.StormRef = $_r_} className={storm_cls} style={style}>
        <canvas ref={($_r_: any) => this.StormCanvasRef = $_r_} className={`${storm_cls}__canvas`}></canvas>
        <div ref={($_r_: any) => this.StormTextRef = $_r_} className={`${storm_cls}__text`}>{text}</div>
      </div>
    )
  }
})
