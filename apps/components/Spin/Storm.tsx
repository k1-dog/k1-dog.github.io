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
  x: {
    kind: 'num',
    at: ($el, _dx, _dy, $ctx) =>
      (($el.x - DOM_X0) / (DOM_X1 - DOM_X0)) * $ctx.width,
  },
  y: {
    kind: 'num',
    at: ($el, _dx, _dy, $ctx) =>
      $ctx.height - (($el.y - DOM_Y0) / (DOM_Y1 - DOM_Y0)) * $ctx.height,
  },
  grid: 'cartesian',
  init: { y0: false, zoom: 0.5 },   // zoom: small centered vignette (same path as wheel zoom)
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
    const dropSeeds = Array.from({ length: DROP_COUNT }, (_, i) => ({
      x: (i + 0.5) / DROP_COUNT + Math.sin(i * 12.9898) * 0.4 / DROP_COUNT,
      r: 6 + ((i * 37) % 5) * 1.1,                       // head radius 6..10.4
      speed: 0.45 + ((i * 53) % 4) * 0.07,                 // cycles/s 0.45..0.66
      phase: ((i * 97) % 11) / 11,                         // 0..1 stagger
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

    let engine: { stop(): void, resize($w: number, $h: number): void } | null = null
    let rafId = 0
    let t0 = 0
    // last measurable host viewport (frame geometry fallback — never window)
    let lastViewW = 1000
    let lastViewH = 800
    // last viewport pushed into engine.resize() (host re-layout tracking)
    let lastEngineW = 0
    let lastEngineH = 0

    // bolt zigzag knots (normalized data y: 1=top, 0=ground) — re-seeded per window
    let boltKnots: Array<{ x: number, y: number }> = []
    let lastWindowIdx = -1
    let boltLitCloud = 0            // index of the cloud the bolt strikes from
    let boltIntensity = 0           // current window flicker intensity (0 = off)
    // nearest drop index per cloud — recomputed every frame (curtain chain)
    let nearest: number[] = [0, 0, 0]

    function seedBolt() {
      boltKnots = []
      // strike origin rides one of the clouds — that cloud lights up
      boltLitCloud = Math.floor(Math.random() * cloudSeeds.length)
      const origin = cloudSeeds[boltLitCloud]
      let x = origin.x + (Math.random() - 0.5) * 0.06
      const yTop = origin.y - 0.04
      const steps = 5
      for (let i = 0; i <= steps; i++) {
        const y = yTop - (i / steps) * yTop   // cloud base → ground
        boltKnots.push({ x, y })
        x += (Math.random() - 0.5) * 0.05
      }
    }

    // per-frame physics → raw array → engine data re-pump (official update channel)
    function frame($now: number) {
      const t = ($now - t0) / 1000
      const raw: any[] = []

      // drops — quadratic fall in data space (y: 1=top, 0=ground): y = 1 - p²;
      // flame tail = a CLOSED 3-segment teardrop outline (t0 base-right,
      // t1 tip, t2 base-left; base width = head diameter): two mirrored
      // convex bezier arcs (explicit cp1/cp2 in PIXEL coords, bypassing the
      // default normal-offset lift) + one straight base line, sealed by
      // stormSeal (t0 -> t1 -> t2 -> t0); the head circle nests at the base
      // viewport = the mask host rect (the .VPContent region); if the host
      // is not measurable this frame, keep the LAST known viewport — never
      // fall back to the window size (it would poison the geometry scale)
      const sizeNow = stormSize()
      if (sizeNow) {
        lastViewW = sizeNow[0]
        lastViewH = sizeNow[1]
        // the host can re-layout AFTER boot (syncRect pins it on the route
        // transition tick) — resize the engine so the canvas style.width
        // (written by retina) follows the host instead of a stale value
        if (sizeNow[0] !== lastEngineW || sizeNow[1] !== lastEngineH) {
          lastEngineW = sizeNow[0]
          lastEngineH = sizeNow[1]
          engine?.resize(sizeNow[0], sizeNow[1])
        }
      }
      const viewW = lastViewW
      const viewH = lastViewH
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

      for (let i = 0; i < DROP_COUNT; i++) {
        const s = dropSeeds[i]
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
        const r = rPix / viewW                   // ...as normalized x
        // flame base rides the TOP rim of the head circle (not the center
        // — the tail never overlaps the head it caps)
        const yBaseN = yHead + rPix / viewH      // normalized y (up = larger)
        const yTipN = yBaseN + v                 // tip above the base
        const vPix = py(yTipN) - py(yBaseN)      // tail length, pixels (<=0)
        const sid = `d${i}`
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
        // base line: base-left -> base-right (chain tail; closePath closes
        // it straight back to the t0 head = the teardrop base)
        raw.push({
          kind: 'trail', sid, part: 't2', x: s.x - r, y: yBaseN,
          cp1x: px(s.x - r / 2), cp1y: byB,
          cp2x: px(s.x + r / 2), cp2y: byB,
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
          raw.push({ kind: 'ripple', sid: `rp${i}`, x: s.x, y: 0, r, fill })
        }
        const p2 = (p + 1 - RIPPLE_DELAY) % 1
        if (p2 < RIPPLE_FRAC) {
          const { r, fill } = ripple(p2 / RIPPLE_FRAC)
          raw.push({ kind: 'ripple', sid: `rq${i}`, x: s.x, y: 0, r, fill })
        }
      }

      // bolt window — flicker envelope: double-blink then a decaying tail
      const tIn = $now % BOLT_PERIOD
      const windowIdx = Math.floor($now / BOLT_PERIOD)
      let boltOn = false
      if (tIn < BOLT_WINDOW) {
        if (windowIdx !== lastWindowIdx) {
          lastWindowIdx = windowIdx
          seedBolt()
        }
        const f = tIn / BOLT_WINDOW
        boltIntensity = (Math.sin(f * Math.PI * 3) * 0.5 + 0.5) * (1 - f * 0.55)
        boltOn = boltIntensity > 0.12
      } else {
        boltIntensity = 0
      }
      const lit = boltOn ? boltIntensity : 0

      // nearest drop index per cloud (by x distance) — the curtain bottom
      // rides exactly these three drops' flame heads; hoisted per frame
      // for the seal callback (chain topology is frame-stable)
      nearest = cloudSeeds.map((cs) => {
        let best = 0, bestD = Infinity
        for (let d = 0; d < dropSeeds.length; d++) {
          const dd = Math.abs(dropSeeds[d].x - cs.x)
          if (dd < bestD) { bestD = dd; best = d }
        }
        return best
      })

      for (let c = 0; c < cloudSeeds.length; c++) {
        const cs = cloudSeeds[c]
        // clouds NEVER light up with the bolt — the flash is the glow disc
        // alone (a lit cloud mass reads as a whole-cloud flash, wrong)
        const puffFill = CLOUD_COLOR
        const bandFill = CLOUD_BAND
        for (const p of cs.puffs) {
          raw.push({ kind: 'cloud', sid: `cp${c}`, x: cs.x + p.dx, y: cs.y + p.dy, r: p.r, fill: puffFill })
        }
        for (let b = 0; b < cs.band.length; b++) {
          const bp = cs.band[b]
          raw.push({
            kind: 'band', sid: `cb${c}`, part: `b${b}`,
            x: cs.x + bp.dx, y: cs.y + bp.dy,
            fill: bandFill,
          })
        }
        // rain curtain — ONE continuous closed chain spanning all three
        // clouds, its bottom edge riding the three NEAREST drops (one per
        // cloud) linked by wavy curves; the middle cloud adds its own
        // concave arc on top (anchored to its nearest drop t0):
        //   o0 (cloud0 outer, gentle concave) -> w0 (wave A0->A1)
        //   -> w1 (wave A1->A2) -> o2 (cloud2 outer, gentle concave)
        //   -> null tail, closePath rides the cloud-base line back to o0
        //   m (cloud1 mid concave arc) -> m2 (zero-length anchor) -> null
        const bandFirst = cs.x + cs.band[0].dx
        const bandLast = cs.x + cs.band[cs.band.length - 1].dx
        const bandMidY = cs.y + cs.band[Math.floor(cs.band.length / 2)].dy
        if (c === 0) {
          // cloud0 top anchor — under the puff base (NOT the band end):
          // the band chain crosses cloud-to-cloud right where the band
          // ends sit, an anchor there would cross it into an X
          const bandFY = cs.y - 0.01
          const topX = cs.x - 0.07
          const a0 = dropT0[nearest[0]]
          const clamp = ($n: number) => Math.max(-0.03, Math.min(0.03, $n))
          const dx = a0.x - topX, dy = a0.y - bandFY
          const nx = clamp(0.3 * dy), ny = clamp(-0.3 * dx)
          raw.push({
            kind: 'curtain', sid: `ct${c}`, part: 'o0',
            x: topX, y: bandFY,
            fill: bandFill,
            cp1x: px(topX + dx * 0.5 + nx),
            cp1y: py(bandFY + dy * 0.5 + ny),
            cp2x: px(topX + dx * 0.5 + nx),
            cp2y: py(bandFY + dy * 0.5 + ny),
          })
        } else if (c === 1) {
          // middle cloud — no dedicated arc segment: the main-chain wavy
          // bottom already rides its nearest drop (one continuous curtain)
        } else {
          // cloud2 base anchor — under the puff base (off the band end,
          // same X-crossing avoidance as cloud0)
          const bandLY = cs.y - 0.01
          const topX = cs.x + 0.07
          const a2 = dropT0[nearest[2]]
          const clamp = ($n: number) => Math.max(-0.03, Math.min(0.03, $n))
          const dx = topX - a2.x, dy = bandLY - a2.y
          const nx = clamp(-0.3 * dy), ny = clamp(0.3 * dx)
          raw.push({
            kind: 'curtain', sid: `ct${c}`, part: 'o2',
            x: a2.x, y: a2.y,
            fill: bandFill,
            cp1x: px(a2.x + dx * 0.5 + nx),
            cp1y: py(a2.y + dy * 0.5 + ny),
            cp2x: px(a2.x + dx * 0.5 + nx),
            cp2y: py(a2.y + dy * 0.5 + ny),
          })
          // o2e — zero-length anchor (cloud2 top anchor); o2 seals onto
          // it so its w/h stays non-zero (the arc stays visible)
          raw.push({
            kind: 'curtain', sid: `ct${c}`, part: 'o2e',
            x: topX, y: bandLY,
            fill: bandFill,
          })
        }
      }

      // wavy bottom edge — the three nearest drops' t0 points linked by
      // wavy curves with ALTERNATING crests and troughs (even hops bump
      // up ~4% screen height, odd hops dip down ~2%) — a real continuous
      // wave, not a flat V; sealed in sequence onto the main curtain chain
      for (let k = 0; k < nearest.length - 1; k++) {
        const from = dropT0[nearest[k]]
        const to = dropT0[nearest[k + 1]]
        const mx = (from.x + to.x) / 2
        const my = (from.y + to.y) / 2 + (k % 2 === 0 ? 0.04 : -0.02)
        raw.push({
          kind: 'curtain', sid: 'cw', part: `w${k}`,
          x: from.x, y: from.y,
          fill: null,
          cp1x: px(mx), cp1y: py(my),
          cp2x: px(mx), cp2y: py(my),
        })
      }

      if (boltOn) {
        const boltFill = rgba(255, 240, 160, Math.round(255 * Math.max(0.35, boltIntensity)))
        for (let k = 0; k < boltKnots.length; k++) {
          const knot = boltKnots[k]
          raw.push({
            kind: 'bolt', sid: 'bolt', part: `k${k}`,
            x: knot.x, y: knot.y, boltFill,
            // first knot is dual-track: zigzag line + the glow halo
            glow: k === 0 || undefined,
          })
        }
      }

      tsukiyoData(raw)
      rafId = requestAnimationFrame(frame)
    }

    const stormPoint = (el: any) => {
      if (el.kind === 'drop') return Shapes.circle(el.r, DROP_COLOR)
      // landing ripple — a HOLLOW stroked ring on the ground line (arc ring
      // mode): no `part` field, so the seal callback never links it into
      // any chain (no fill-lane interference)
      if (el.kind === 'ripple') return Shapes.ring(el.r, el.fill)
      // explicit cp1/cp2 (pixel coords) — exact cubic bezier, no default lift
      if (el.kind === 'trail') {
        return Shapes.curve(
          rgba(90, 130, 200, 130),
          [el.cp1x, el.cp1y], [el.cp2x, el.cp2y],
        )
      }
      if (el.kind === 'band') return Shapes.curve(el.fill)
      // curtain — all Curves with explicit cp ('o0'/'o2' gentle concave
      // outer arcs, 'w*' wavy bottom links); 'o2e' is a zero-length Line
      // anchor (w/h=0, invisible) that keeps o2's w/h non-zero
      if (el.kind === 'curtain' && el.part === 'o2e') {
        return Shapes.line(el.fill)
      }
      if (el.kind === 'curtain') {
        return Shapes.curve(el.fill ?? CLOUD_BAND, [el.cp1x, el.cp1y], [el.cp2x, el.cp2y])
      }
      if (el.kind === 'cloud') return Shapes.circle(el.r, el.fill)
      // bolt — dual-track: zigzag line + (first knot only) the glow halo
      if (el.kind === 'bolt' && el.glow) {
        return [
          Shapes.line(el.boltFill),
          // glow halo — FIXED 64px disc (the flash reads as one clean
          // disc riding the strike origin; the clouds stay unlit)
          Shapes.arc(64, 0, TAU, rgba(255, 246, 200, Math.round(140 * boltIntensity))),
        ]
      }
      if (el.kind === 'bolt') return Shapes.line(el.boltFill)
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
    let sealIndex: Map<string, number> = new Map()
    let sealIndexRaw: any = null
    const stormSeal = (el: any, i: number, model: any) => {
      if (el.part === undefined) return null
      // one-time index build per re-pump: "sid:part" -> SoA slot
      if (model.raw !== sealIndexRaw) {
        sealIndexRaw = model.raw
        sealIndex = new Map()
        for (let s = 0; s < model.count; s++) {
          const e = model.elements[model.src[s]]
          if (e && e.sid !== undefined && e.part !== undefined) sealIndex.set(`${e.sid}:${e.part}`, s)
        }
      }
      const [tag, num] = [el.sid, Number(el.part.slice(1))]
      if (el.kind === 'trail') {
        // Δloop:false — flame tails stay STROKE-ONLY (the setFill underlay is
        // reserved for the cloud slabs); a filled teardrop would also hide
        // the drop head circle beneath it
        if (num < 2) {
          // right half then left half of the teardrop
          return { Δi: sealIndex.get(`${tag}:t${num + 1}`) ?? -1, Δloop: false }
        }
        // t2 tail — chain tail, closePath draws the straight base line
        // back to t0 (two concave arcs + a straight base = the teardrop)
        return null
      }
      if (el.kind === 'band') {
        // ONE continuous wavy outline riding all three clouds: b0..b4 per
        // cloud, each tail hops onto the NEXT cloud's b0 — and the LAST
        // cloud wraps back onto the FIRST (closed loop, cloud0 b0).
        // Δloop:false — stroke only: the loop never joins the closed fill
        // lane (filling it would smear a slab across the whole screen)
        if (num < 4) return { Δi: sealIndex.get(`${tag}:b${num + 1}`) ?? -1, Δloop: false }
        const cloudIdx = Number(tag.slice(2))
        const nextCloud = (cloudIdx + 1) % cloudSeeds.length
        return { Δi: sealIndex.get(`cb${nextCloud}:b0`) ?? -1, Δloop: false }
      }
      if (el.kind === 'curtain') {
        // main curtain chain: cloud0 outer 'o0' -> wave 'w0' -> wave 'w1'
        // -> cloud2 outer 'o2' -> null tail (closePath rides the cloud
        // base line back to 'o0') — FILLED (the rain sheet under the slabs)
        if (el.sid === 'ct0' && el.part === 'o0') {
          return { Δi: sealIndex.get('cw:w0') ?? -1 }
        }
        if (el.sid === 'cw') {
          const k = Number(el.part.slice(1))
          // last wave hops onto cloud2's outer arc
          if (k >= nearest.length - 2) {
            return { Δi: sealIndex.get('ct2:o2') ?? -1 }
          }
          return { Δi: sealIndex.get(`cw:w${k + 1}`) ?? -1 }
        }
        if (el.sid === 'ct2' && el.part === 'o2') {
          // o2 rides onto its zero-length base anchor, then the chain ends
          return { Δi: sealIndex.get('ct2:o2e') ?? -1 }
        }
        return null
      }
      if (el.kind === 'bolt') {
        const next = `k${num + 1}`
        const ti = sealIndex.get(`bolt:${next}`)
        // Δloop:false — the zigzag strokes only, never joins the closed
        // fill lane (a filled zigzag ribbon would cut across the curtains)
        return ti === undefined ? null : { Δi: ti, Δloop: false }
      }
      return null
    }

    // raw → tsukiyo (pumped per-frame via the engine data channel; frame
    // only runs once the engine exists, no pre-mount buffering needed)
    let tsukiyo: any = null
    const DIM = { dimX: 'sid', dimY: ['y'] }
    function tsukiyoData($raw: any[]) {
      tsukiyo?.data($raw, DIM)
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
      if (rafId || !engine) return
      // one rAF hop — let the v-show DOM layout land first (offsetWidth=0
      // while display:none); frame self-schedules its next rAF at its tail
      const boot = () => {
        // clear any poisoned inline size FIRST (a display:none-era
        // resize wrote 300x150 into style, which overrides the CSS
        // inset stretch and locks the canvas forever) — the inset must
        // own the layout so offsetWidth reports the true scene box
        const cv = StormCanvasRef.value as HTMLCanvasElement | null
        if (cv && (cv.style.width || cv.style.height)) {
          cv.style.width = ''
          cv.style.height = ''
        }
        const size = stormSize()
        if (!size) {
          // host still not laid out — retry next frame (rafId stays live)
          rafId = requestAnimationFrame(boot)
          return
        }
        engine!.resize(size[0], size[1])
        t0 = performance.now()
        frame(t0)
      }
      rafId = requestAnimationFrame(boot)
    }
    function stopStorm() {
      cancelAnimationFrame(rafId)
      rafId = 0
    }

    function onResize() {
      const size = stormSize()
      if (size) engine?.resize(size[0], size[1])
    }

    function anchorAxis() {
      const { init, ...axis } = stormAxis()
      return init?.y0 === false ? { ...axis, init: { y0: false } } : axis
    }

    onMounted(async () => {
      if (StormCanvasRef.value) {
        tsukiyo = new Tsukiyo(StormCanvasRef.value)
          .scale(DIM)
          .coord(stormAxis())
          .point(stormPoint)
          .paths(stormSeal)
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
              input: [
                { kind: 'anchor', part: 'tl', x: 0.04, y: 0.94 },
                { kind: 'anchor', part: 'tr', x: 0.96, y: 0.94 },
                { kind: 'anchor', part: 'bl', x: 0.04, y: 0.06 },
                { kind: 'anchor', part: 'br', x: 0.96, y: 0.06 },
              ],
              // corner pin stud — two concentric circles with a raised
              // relief: outer plate ring, dark under-shadow, bright body,
              // offset highlight dot (the inner disc pops out of the screen)
              point: (el: any) => [
                Shapes.circle(11, rgba(120, 145, 185, 90)),     // outer plate ring
                Shapes.circle(6, rgba(40, 60, 100, 140)),       // under-shadow
                Shapes.circle(6, rgba(130, 160, 210, 235)),     // raised body
                Shapes.circle(2.2, rgba(235, 245, 255, 220)),   // top-left highlight
              ],
              coord: anchorAxis(),
            }],
          }))
        engine = await tsukiyo.draw()
          // closed-path fill layer — every sealed curve loop (drop flame tails
          // + the continuous cloud belt) closes into Path2D chains and paints
          // as the solid underlay body beneath the stroke outlines
          ; (engine as any).setFill(rgba(60, 72, 92, 220))
        if (props.spinning) startStorm()
        window.addEventListener('resize', onResize)
      }
    })

    watch(() => props.spinning, ($isLoading) => {
      if ($isLoading) startStorm()
      else stopStorm()
    })

    onBeforeUnmount(() => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      engine?.stop()
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
