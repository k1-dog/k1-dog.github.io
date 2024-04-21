import { InteractionT, AnimationOptionsT } from './m9.d';
type M9TypesT = 'Bar' | 'Pie' | 'Radar';
/**
* @type { AnimationCtor } 动画处理器
* 记录 M9-Charts 画布中, 核心图形的对应动画渲染器
*/
declare class M9Animation {
    static Animators: Record<'Bar', Record<'click', AnimationOptionsT>>;
    _AID: string;
    _M9Chart?: any;
    _interaction?: InteractionT;
    constructor($Interaction: InteractionT, $M9Chart: any);
    /**
    * 启动动画
    * @param { * M9图表类型 * } M9CType
    */
    _ready_(M9CType?: M9TypesT): void;
    _run_($AnimationOptions: any, $RAF_T?: number | null): void;
    /**
    * 停止动画
    *
    */
    _stop_(): void;
    _notifyM9ElDraw_(): void;
    _updateA_I($newInteraction: InteractionT): void;
}
export default M9Animation;
