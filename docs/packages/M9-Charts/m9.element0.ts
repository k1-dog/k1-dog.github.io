export type M9PathT =
  Record<'w' | 'h' | 'l' | 't' | 'r' | 'b' | 'n', number>
    &
  { core: any }
    &
  { label?: string, color?: string, angle?: number, startAngle?: number, angle2?: number, endAngle?: number, radius?: number, rotationAngle?: number } // 饼图-环图 路径参数

interface M9EL0Props {
  /**
   * m9 - 基元素宽度
   */
  width: string | number;
  /**
   * m9 - 基元素高度
   */
  height: string | number;
  /**
   * m9 - 图形 Path 形状
   */
  m9Path: M9PathT;
  /**
   * m9 - 基础动画效果
   */

}

export default class M9Element0 implements M9EL0Props {

  width: M9EL0Props['width'] = 0

  height: M9EL0Props['height'] = 0

  m9Path: M9EL0Props['m9Path'] = { w: 0, h: 0, l: 0, t: 0, r: 0, b: 0, n: -1, core: null }

  constructor ($Args: { w: M9EL0Props['width']; h: M9EL0Props['height'] }) {
    const { w, h }= $Args
    
    this.width = w
    
    this.height = h
  }
}