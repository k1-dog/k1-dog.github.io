import { _noop } from './helper.core';
import { M9PathT } from './m9.element0';
import { M9Interactor as InteractorClassT, M9Chart as M9T } from './m9.d';
import M9Element from './m9.element0';
declare class Bar extends M9Element {
    M9: M9T;
    xPoints: Array<number>;
    yPoints: Array<number>;
    constructor($BarConfig: any);
    initConfig($BarConfig: any): void;
    initBind(): void;
    __Bar__(Interactor: InteractorClassT): void;
    U$CalcXYAxes(): {
        axisX: {
            start: number;
            end: number;
            len: number;
        };
        axisY: {
            start: number;
            end: number;
            len: number;
        };
    };
    X_Y($ctx: any): void;
    X_Y_Lines($ctx: any): void;
    /**
     * @description 描制核心图形 path 路径
     * @param $ctx
     */
    buildingPaths(_M9CALL_?: typeof _noop): {
        w: number;
        h: number;
        t: number;
        b: number;
        l: number;
        r: number;
        n: number;
        core: number;
    }[];
    draw($ctx: any, $path: M9PathT): void;
}
export default Bar;
