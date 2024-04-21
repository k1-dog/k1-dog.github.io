type NumOrStr<ns> = ns;
type MRipplePos = {
    x: NumOrStr<number>;
    y: NumOrStr<number>;
};
type MRippleSize = NumOrStr<number>;
type MRippleColor = NumOrStr<string>;
type MRippleDurT = NumOrStr<number> | undefined;
/**
 * @see 美九未来--波纹涟漪--动画元素
 */
export interface MRippleProps {
    /**
     * @see 波纹外部开关
     * @param { boolean } aliveable
     */
    aliveable: boolean;
    /**
     * @see 波纹浮现--位置 @description 父元素_[被包裹元素]
     * @param { MRipplePos } pos
     */
    pos: MRipplePos;
    /**
     * @see 波纹浮现--大小
     * @param { MRippleSize } size
     */
    size: MRippleSize;
    /**
     * @see 波纹涟漪--时长
     */
    duration?: MRippleDurT;
    /**
     * @see 波纹--颜色
     */
    color?: MRippleColor;
    /**
     * @see 外部样式值
     */
    style?: object;
    /**
     * @see 外部类名
     */
    className?: NumOrStr<string>;
    addEndListener: () => void;
}
declare enum DUR {
    timeout = 400
}
declare const _default: import("vue").DefineComponent<{
    pos: {
        type: ObjectConstructor;
        default: {};
    };
    size: {
        type: (StringConstructor | NumberConstructor)[];
        default: number;
    };
    duration: {
        type: NumberConstructor;
        default: DUR;
    };
    color: {
        type: StringConstructor;
        default: string;
    };
    style: {
        type: ObjectConstructor;
        default: {};
    };
    className: {
        type: StringConstructor;
        default: string;
    };
    addEndListener: {
        type: FunctionConstructor;
        default: () => void;
    };
}, {
    state: {
        rippleExisting: boolean;
    };
    handleExited: () => void;
    handleEntered: () => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    pos: {
        type: ObjectConstructor;
        default: {};
    };
    size: {
        type: (StringConstructor | NumberConstructor)[];
        default: number;
    };
    duration: {
        type: NumberConstructor;
        default: DUR;
    };
    color: {
        type: StringConstructor;
        default: string;
    };
    style: {
        type: ObjectConstructor;
        default: {};
    };
    className: {
        type: StringConstructor;
        default: string;
    };
    addEndListener: {
        type: FunctionConstructor;
        default: () => void;
    };
}>>, {
    pos: Record<string, any>;
    size: string | number;
    duration: number;
    color: string;
    style: Record<string, any>;
    className: string;
    addEndListener: Function;
}, {}>;
export default _default;
