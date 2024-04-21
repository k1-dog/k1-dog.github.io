import { MTColumnT, MTColumnsT, MTableProps } from "./Type";
import { CSSProperties } from "vue";
export declare const M9TableHHeight = 35;
export declare const TableScrollXWidth = 800;
export declare function _makeBetterAttributesInColumns(MTColumns: MTColumnsT): MTColumnsT;
export declare function _makeBetterAttributesInData(MTData: MTableProps['MikuDataSource']): any;
export declare function _rebuildBetterColumns(MTColumns: MTColumnsT): any;
export declare function _calcFixedOffsetValue(MTColumns: MTColumnsT): {
    isFirstLeft: boolean;
    leftMap: {};
    leftTotalOffset: number;
    isFirstRight: boolean;
    rightMap: {};
    rightTotalOffset: number;
};
export declare function _calcFixedOffsetStyle(MTColumn: MTColumnT, _fixedOffsetValue: any, rowLevel?: number): CSSProperties;
