import { MRippleProps } from './MRipple';
type MRippleType = any;
type MouseEventT<M> = any;
type UseHTMLEleT<P> = P extends HTMLElement ? P : HTMLElement;
type UseHTMLEleAttrsT<Q> = Q extends HTMLElement ? any : unknown;
/** @see 波纹容器--元素标签原生_AttibutesProps_定义 */
type rippleSpanWrapHTMLProps<H> = ({
    EvReturnT: ReturnType<VoidFunction>;
    onMouseDownE: MouseEventT<H>;
    onMouseUpE: MouseEventT<H>;
    onBubbleE: MouseEventT<H>;
    handleMouseClick: (e: MouseEventT<H>) => void;
    handleMouseUp: (e: MouseEventT<H>) => void;
    onBubble: (e: MouseEventT<H>) => void;
} & UseHTMLEleAttrsT<H>);
type RippleCircleAttrsT = {
    size: MRippleProps['size'];
    pos: MRippleProps['pos'];
};
declare const _default: import("vue").DefineComponent<{
    className: {
        type: StringConstructor;
        default: undefined;
    };
    style: {
        type: ObjectConstructor;
        default: undefined;
    };
}, {
    state: {
        rippleBuffer: never[];
        rippleRoundKey: number;
    };
    createRipple: (rippleAttrs: RippleCircleAttrsT) => MRippleType;
    handleMouseUp: <Y>(e: ({
        EvReturnT: void;
        onMouseDownE: any;
        onMouseUpE: any;
        onBubbleE: any;
        handleMouseClick: (e: any) => void;
        handleMouseUp: (e: any) => void;
        onBubble: (e: any) => void;
    } & UseHTMLEleAttrsT<UseHTMLEleT<Y>>)["onMouseUpE"]) => void;
    handleMouseClick: <Z>(e: ({
        EvReturnT: void;
        onMouseDownE: any;
        onMouseUpE: any;
        onBubbleE: any;
        handleMouseClick: (e: any) => void;
        handleMouseUp: (e: any) => void;
        onBubble: (e: any) => void;
    } & UseHTMLEleAttrsT<UseHTMLEleT<Z>>)["onMouseDownE"]) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    className: {
        type: StringConstructor;
        default: undefined;
    };
    style: {
        type: ObjectConstructor;
        default: undefined;
    };
}>>, {
    style: Record<string, any>;
    className: string;
}, {}>;
export default _default;
