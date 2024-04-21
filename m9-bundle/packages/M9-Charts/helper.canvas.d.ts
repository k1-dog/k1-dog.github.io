import { M9Chart } from './m9.d';
/**
 * @type { RetinaBuildingForOurEyes } 重构视觉系统 - 计算缩放倍率 => 得出最终横纵坐标系
 * xScales = [30, 50, 80, 140, 250]
 * yScales = [5, 20, 60, 150, 280]
 * eg. 例子
 * 10 <= yScales <= 1500
 * canvas.h = 300
 * -> ratio = (1500 / 300) * 1.2 = 6
 * -> yAxisPoint = yScales / ratio
 * => 1.66 <= yAxisPoint <= 250
 */
export declare function RetinaBuildingForOurEyes($M9Chart: any, $XScales0: any, $YScales0: any): {
    xAxisPoints: any;
    yAxisPoints: any;
    defaultGapX: number;
    defaultGapY: number;
};
export declare function U$Push_Pop_Ctx2D($ctx: CanvasRenderingContext2D, _call_?: Function, ...args: any[]): void;
/**
 * @description 获取设备像素比
 * @function getDevicePixelRatio
 *
 */
export declare function getDevicePixelRatio(): number;
/**
 * @description 修整设备像素比 - 调节画布清晰度
 * @param chart
 * @param forceRatio
 * @param forceStyle
 * @returns True if the canvas context size or transformation has changed.
 */
export declare function _DeviceRatioBuilding(chart: M9Chart, forceRatio?: number): boolean | void;
/**
 * @description 颜色增进
 * @function H_ColorLightenDarken()
 * @param $color @param $percentage
 * @return @param $newColor
 *
 * .eg #ef10be * 110% = ?
 */
export declare function H_ColorLightenDarken($color: any, $percentage?: number): string;
/**
 * @description 颜色增进 - (ImageData RGBa·版本)
 * @function H_ImageDataRGBa()
 * @param $imageData @param $percentage @param { + | - } $optCode
 * @return { ImageData } $imageData
 *
 * .eg rgba(1, 2, 3, 0.5) * 110% = ?
 */
export declare function H_ImageDataRGBa($imageData: any, $percentage?: number, $optCode?: string): any;
export declare function addRoundedRectPath(ctx: CanvasRenderingContext2D, rect: any): void;
export declare function H_ClearArcArea($ctx: any, $clearArgs: any): void;
