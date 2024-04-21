export type M9PathT = Record<'w' | 'h' | 'l' | 't' | 'r' | 'b' | 'n', number> & {
    core: any;
} & {
    label?: string;
    color?: string;
    angle?: number;
    startAngle?: number;
    angle2?: number;
    endAngle?: number;
    radius?: number;
    rotationAngle?: number;
};
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
}
export default class M9Element0 implements M9EL0Props {
    width: M9EL0Props['width'];
    height: M9EL0Props['height'];
    m9Path: M9EL0Props['m9Path'];
    constructor($Args: {
        w: M9EL0Props['width'];
        h: M9EL0Props['height'];
    });
}
export {};
