import M9Element, { M9PathT } from './m9.element0';
import { M9Chart as M9T, M9Interactor as InteractorClassT, M9DatasetT } from './m9.d';
type PointAtCenterT = {
    x0: number;
    y0: number;
};
declare class Pie extends M9Element {
    dataset: M9DatasetT;
    M9: M9T;
    _pointAtCenter: PointAtCenterT;
    _angle1: number;
    _angle2: number;
    _radius: number;
    static precision: number;
    static pieColors: string[];
    static U$ConvertAngleToRadian($Angle: number): number;
    constructor($PieConfig: any);
    initEyesSeeingPie(): void;
    initConfig(pieConfig: any): void;
    initBind(): void;
    __Pie__(Interactor: InteractorClassT): void;
    drawLineTip($ctx: CanvasRenderingContext2D, $path: M9PathT): void;
    buildingPaths(_M9CALL_: any): {
        angle1: number;
        angle2: number;
        label: string;
        percentage: number;
        rotationAngle: number;
        radius: number;
        n: number;
        core: any;
    }[];
    draw($ctx: CanvasRenderingContext2D, $path: M9PathT): void;
    __isInM9Area__($point: any, $interaction: any, $isFromEventClickOrM9Self?: boolean): boolean | "4th" | "3rd" | "2nd" | "1st";
}
export default Pie;
