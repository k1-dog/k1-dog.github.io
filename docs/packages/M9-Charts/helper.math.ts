export const PI = Math.PI;
export const _2PI = 2 * PI;
export const _2_3PI = PI * 3 / 2;
export const PITAU = _2PI + PI;
export const INFINITY = Number.POSITIVE_INFINITY;
export const RAD_PER_DEG = PI / 180;
export const HALF_PI = PI / 2;
export const QUARTER_PI = PI / 4;
export const TWO_THIRDS_PI = PI * 2 / 3;
export const _360 = 360

export function H_pow ($num: number, $pow: number = 2) {
  return Math.pow($num, $pow)
}

export function H_ceil ($num: number) {
  return Math.ceil($num)
}

export function H_floor ($num: number) {
  return Math.floor($num)
}

export function H_sin ($angle: number) {
  return Math.sin($angle)
}

export function H_sqrt ($num: number) {
  return Math.sqrt($num)
}

export function H_abs ($num: number) {
  return Math.abs($num)
}

// 检测某个数字 是否在一段范围之内
export function _isBetween ($num, $1, $2) {
  return $num >= Math.min($1, $2) && $num <= Math.max($1, $2)
}

// 找寻整型数组 最值
export function _limit ($arr = []) {
  return {
    max: Math.max(...$arr),
    min: Math.min(...$arr)
  }
}

// 卡边缘距离
export function _isEdge ($location, $edge) {
  const { t, b, l, r } = $edge
  const { x, y } = $location
  return _isBetween(x, l, r) && _isBetween(y, t, b)
}
