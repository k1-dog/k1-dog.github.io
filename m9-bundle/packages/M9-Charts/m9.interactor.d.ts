import M9Animation from './m9.animator';
import { M9Chart, M9Animation as AnimationT, InteractionT, AnimationOptionsT, M9PathT, Point } from './m9.d';
/**
 * @type { InteractorCtor } 位置探测器
 * 记录 M9-Charts 画布中, 核心图形的有效范围信息 (横纵坐标 长度大小 边框大小 上下左右距离 该范围内图形像素数据 ImageData 索引顺序)
 */
declare class M9Interactor {
    _interactions: Array<InteractionT>;
    _M9Chart: null | M9Chart;
    _MapIA: WeakMap<InteractionT, AnimationT>;
    constructor($M9Chart: any);
    _buildingWithCtxPath_($m9Path: M9PathT): InteractionT;
    _sniffing_($m9Path: M9PathT): void;
    /**
   * @description 位置的合法性检测 [某位置对象参数 是否位于规定 M9Chart 画布大小之内]
   * @function _isM9Edge_
   * @param { InteractionT } $Interaction
   * @return { boolean } is
   */
    _isM9Edge_($Interaction: InteractionT): boolean;
    _Animations_(): void;
    _StartAnimation_($interaction: InteractionT, $AnimationOptions: AnimationOptionsT): void;
    _isInLocation($P: Point, _call_: any): false | (M9Animation | InteractionT | undefined)[];
    _buildingIID_(): string;
    _updateI_A_($oldInteraction: InteractionT, $newInteraction: InteractionT): void;
    _notifyA_I_($newInteraction: InteractionT): void;
}
export default M9Interactor;
