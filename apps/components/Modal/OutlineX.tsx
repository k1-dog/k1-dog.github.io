import { PropType, defineComponent } from "vue"
import { Tsukiyo, Shapes, rgba } from "@k1/tsukiyo"
import type { ITsukiyoLocator, RoadFn } from "@k1/tsukiyo"

// ---- constants (single place, no magic numbers scattered) ----

const OUTSET_RATIO = 0.12

const PAD_RATIO = 0.6

interface IWavePoint {
  /** position ratio of the canvas (cw x ch) */
  x: number
  y: number
  /** handle DIRECTION (unit-ish; normalized at use) */
  hx: number
  hy: number
  /** handle strength — length ratio of the outgoing segment chord */
  k: number
}

/**
 * cloud key points, clockwise from TL. The loop reads like the design:
 * flat top -> right wave (bulge, dent, bulge) -> flat bottom -> left wave.
 */
const CLOUD_POINTS: IWavePoint[] = [
  // top edge (left -> right): horizontal handles, gentle flat arc
  { x: 0.15, y: 0.08, hx: 1, hy: 0, k: 0.20 },   // TL corner (stronger bend)
  { x: 0.50, y: 0.055, hx: 1, hy: 0, k: 0.35 },  // top mid (flat arc)
  { x: 0.85, y: 0.08, hx: 1, hy: 0, k: 0.20 },   // TR corner (stronger bend)
  // right edge (top -> bottom): vertical handles, bulge-dent-bulge wave
  { x: 0.92, y: 0.26, hx: 0, hy: 1, k: 0.30 },   // upper bulge
  { x: 0.865, y: 0.70, hx: 0, hy: 1, k: 0.35 },  // shallow dent
  { x: 0.88, y: 0.82, hx: 0, hy: 1, k: 0.40 },   // lower bulge
  // bottom edge (right -> left): corners bend more (stronger k)
  { x: 0.85, y: 0.92, hx: 1, hy: 0, k: 0.20 },   // BR corner (stronger bend)
  { x: 0.50, y: 0.945, hx: 1, hy: 0, k: 0.35 },  // bottom mid (flat arc)
  { x: 0.15, y: 0.92, hx: 1, hy: 0, k: 0.20 },   // BL corner (stronger bend)
  // left edge (bottom -> top): exact mirror of right (x = 1-x, same y)
  { x: 0.12, y: 0.82, hx: 0, hy: 1, k: 0.40 },   // mirror right lower bulge (0.88, 0.82)
  { x: 0.135, y: 0.70, hx: 0, hy: 1, k: 0.35 },  // mirror right dent (0.865, 0.70)
  { x: 0.08, y: 0.26, hx: 0, hy: 1, k: 0.30 },   // mirror right upper bulge (0.92, 0.26)
]

/** dim config — single source shared by first draw and every refresh */
const OUTLINE_DIM = { dimX: 'id', dimY: ['value'] }

interface Anchor {
  id: string
  value: number
  px: number
  py: number
  /** cubic-bezier control points of the segment STARTING at this anchor:
   *  cp1 = outgoing handle, cp2 = incoming handle of the NEXT point */
  cp1?: [number, number]
  cp2?: [number, number]
}

/** canvas metrics — canvas wraps the host by `out` on every side;
 *  pad = content inset (same math source, consumed via css var) */
function outlineMetrics($w: number, $h: number) {
  const out = Math.max(2, Math.min($w, $h) * OUTSET_RATIO)
  return { out, cw: $w + out * 2, ch: $h + out * 2 }
}

/**
 * buildOutlineAnchors — resolve CLOUD_POINTS into one closed chain of
 * cubic-bezier segments. For each pair (A -> B):
 *   cp1 = A + norm(A.h) * A.k * |AB|   (A's outgoing handle)
 *   cp2 = B - norm(B.h) * B.k * |AB|   (B's incoming handle)
 */
function buildOutlineAnchors($cw: number, $ch: number): Anchor[] {
  // resolve key points to absolute canvas coords
  const pts = CLOUD_POINTS.map($p => ({
    x: $p.x * $cw, y: $p.y * $ch,
    hx: $p.hx, hy: $p.hy, k: $p.k,
  }))
  const norm = ($hx: number, $hy: number): [number, number] => {
    const len = Math.hypot($hx, $hy) || 1
    return [$hx / len, $hy / len]
  }
  const n = pts.length
  const anchors: Anchor[] = []
  // chord lengths around the loop (i = segment i -> i+1)
  const chords: number[] = []
  for (let _i = 0; _i < n; _i++) {
    const a = pts[_i], b = pts[(_i + 1) % n]
    chords.push(Math.hypot(b.x - a.x, b.y - a.y) || 1)
  }
  // handle length of a point = k x min(its two neighbouring chord lengths):
  // clamped by BOTH sides so a long handle can never overshoot past a short
  // neighbouring segment into a self-crossing kink (left edge crossed before)
  const handleLen = ($i: number): number =>
    pts[$i].k * Math.min(chords[($i - 1 + n) % n], chords[$i])
  for (let _i = 0; _i < n; _i++) {
    const a = pts[_i]
    const b = pts[(_i + 1) % n]
    // A's outgoing handle: from A along its direction, neighbour-clamped
    const [ax, ay] = norm(a.hx, a.hy)
    const aLen = handleLen(_i)
    const cp1: [number, number] = [a.x + ax * aLen, a.y + ay * aLen]
    // B's incoming handle: from B AGAINST its direction, neighbour-clamped
    const [bx, by] = norm(b.hx, b.hy)
    const bLen = handleLen((_i + 1) % n)
    const cp2: [number, number] = [b.x - bx * bLen, b.y - by * bLen]
    // one Anchor per segment — the curve starts AT this anchor
    anchors.push({ id: `m${_i}`, value: 1, px: a.x, py: a.y, cp1, cp2 })
  }
  // closing anchor — same point as the first, keeps the chain linkable
  const first = anchors[0]
  anchors.push({ id: 'a-close', value: 1, px: first.px, py: first.py })
  return anchors
}

/** parse a css color string ("#rrggbb" / "rgb(...)") into a packed rgba number */
function parseCssColor($css: string, $fallback: number): number {
  if (!$css) return $fallback
  const s = $css.trim()
  let _r = 0, _g = 0, _b = 0, _a = 255
  if (s[0] === '#') {
    const hex = s.slice(1)
    if (hex.length >= 6) {
      _r = parseInt(hex.slice(0, 2), 16)
      _g = parseInt(hex.slice(2, 4), 16)
      _b = parseInt(hex.slice(4, 6), 16)
      if (hex.length >= 8) _a = parseInt(hex.slice(6, 8), 16)
    }
  } else if (s.startsWith('rgb')) {
    const nums = s.match(/[\d.]+/g)
    if (nums && nums.length >= 3) {
      _r = Number(nums[0]); _g = Number(nums[1]); _b = Number(nums[2])
      if (nums.length >= 4) _a = Math.round(Number(nums[3]) * 255)
    }
  } else {
    return $fallback
  }
  if ([_r, _g, _b, _a].some(Number.isNaN)) return $fallback
  return rgba(_r, _g, _b, _a)
}

export default defineComponent({
  name: 'M9OutlineX',
  props: {
    // host element getter — the modal element to outline (read lazily, always fresh)
    getHost: {
      type: Function as PropType<() => HTMLElement | null>,
      required: true
    }
  },
  setup(props, ctx) {
    let _engine: ReturnType<Tsukiyo['getEngine']> = null
    let _canvasEl: HTMLCanvasElement | null = null
    // live colors — re-read from theme css vars on every refresh so a runtime
    // theme switch (light <-> dark) repaints the cloud without a re-mount
    let _bgColor = rgba(247, 243, 208, 255)
    let _strokeColor = rgba(122, 88, 60, 255)

    // AC dual-mode palette from host css vars:
    // light = cream yellow bg + deep brown stroke; dark = teal bg + mint stroke
    function readColors($host: HTMLElement) {
      const styles = getComputedStyle($host)
      const bgCss = styles.getPropertyValue('--modal-bgClr') || ''
      const strokeCss = styles.getPropertyValue('--modal-borderClr') ||
        styles.getPropertyValue('--inner-element-borderSideClr') ||
        styles.getPropertyValue('--element-borderClr') || ''
      _bgColor = parseCssColor(bgCss, rgba(247, 243, 208, 255))
      _strokeColor = parseCssColor(strokeCss, rgba(122, 88, 60, 255))
    }

    // locator — anchor absolute coords pass-through (no normalization),
    // grid 'none' (decoration, no chart axes) + real value domain (no zero-baseline)
    const outlineLocator = (): ITsukiyoLocator => ({
      x: { kind: 'cat', at: ($el: any) => $el.px },
      y: { kind: 'cat', at: ($el: any) => $el.py },
      grid: 'none',
      init: { y0: false },
    })

    // seal — one closed chain around the anchor ring; the declared fill color
    // rides the chain every frame (theme switches only change the closure)
    const outlineRoad: RoadFn = ($el, $i, $model) => ({
      Δi: ($i + 1) % $model.count,
      fill: _bgColor,
    })

    function setupEngine() {
      if (!_canvasEl || _engine) return
      const host = props.getHost?.()
      if (!host) return

      const w = host.offsetWidth
      const h = host.offsetHeight
      if (w <= 0 || h <= 0) return

      readColors(host)

      const { out, cw, ch } = outlineMetrics(w, h)
      _canvasEl.style.width = `${cw}px`
      _canvasEl.style.height = `${ch}px`
      _canvasEl.style.left = `${-out}px`
      _canvasEl.style.top = `${-out}px`

      new Tsukiyo(_canvasEl)
        .input(buildOutlineAnchors(cw, ch))
        .scale(OUTLINE_DIM)
        .coord(outlineLocator())
        .shape(($el: any) => Shapes.curve(_strokeColor, $el.cp1, $el.cp2))
        .paths(outlineRoad)
        .layering(() => ({ layers: [] }))
        .draw('2d')
        .then(($engine) => {
          _engine = $engine
          refresh()
        })
    }

    /** refresh — recompute anchors for a new host size and redraw */
    function refresh() {
      const host = props.getHost?.()
      if (!host) return
      const w = host.offsetWidth
      const h = host.offsetHeight
      if (w <= 0 || h <= 0) return

      if (!_engine) {
        // engine not ready yet (first mount race) — retry setup on next tick flow
        setupEngine()
        return
      }
      // re-read theme colors so a runtime light/dark switch repaints correctly
      readColors(host)
      // canvas wraps the host by `out` on every side (circumscribed cloud)
      const { out, cw, ch } = outlineMetrics(w, h)
      _canvasEl!.style.width = `${cw}px`
      _canvasEl!.style.height = `${ch}px`
      _canvasEl!.style.left = `${-out}px`
      _canvasEl!.style.top = `${-out}px`
      _engine.resize(cw, ch)
      // dim must ride along — the std fast path would rebuild elements without px/py
      _engine.data(buildOutlineAnchors(cw, ch), OUTLINE_DIM)
    }

    function onCanvasRef($el: any) {
      _canvasEl = $el
      if ($el) setupEngine()
    }

    ctx.expose({ refresh })

    return { onCanvasRef }
  },
  render() {
    const children = this.$slots.default?.()
    return (
      <div>
        <canvas
          ref={($el: any) => this.onCanvasRef($el)}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            // solid cloud fill must sit BELOW the modal content but ABOVE the.
            zIndex: -1,
          }}
        ></canvas>
        <div style={{ padding: "2.2rem" }}>{children}</div>
      </div>
    )
  }
})