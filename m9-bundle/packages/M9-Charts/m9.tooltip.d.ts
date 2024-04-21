import { M9Chart as M9ChartT } from './m9';
/**
 * @description [美九未来 - 气泡提示框 位置探测器]
 */
/**
 * @class M9Tooltip
 * @description [美九未来 - 图表库 全局气泡提示框绘制工具类]
 */
export default class M9Tooltip {
    static tooltipOffset: {
        x: number;
        y: number;
        X_OFFSET: number;
        Y_OFFSET: number;
    };
    M9Chart: M9ChartT;
    toolTitle: string;
    toolContent: string;
    _tooltipElement: HTMLElement;
    toolEvent: ($ev: MouseEvent) => void;
    _running: boolean;
    constructor($M9Chart: M9ChartT);
    __init__(): void;
    __LinkM9__(): void;
    __unLinkM9__(): void;
    __want_its_tool__(): void;
    __unwant_its_tool__(): void;
    __summon_tool__($interaction: any): void;
    __unsummon_tool__(): void;
    __clean_tool__(): void;
    $hide(): void;
    $show($left: number, $top: number): void;
}
