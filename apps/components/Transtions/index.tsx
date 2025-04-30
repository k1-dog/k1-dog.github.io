
import MRipple from './MRippleWrapper'
import Expand from './Expand'
import Bound from './Bound'

const MikuTransition = {
  MRipple,
  Expand,
  Bound
}

export interface MElement extends HTMLElement {
  $miku_width?: HTMLElement['scrollWidth']
  $miku_height?: HTMLElement['scrollHeight']
}

export default MikuTransition
