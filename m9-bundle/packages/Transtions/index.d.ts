declare const MikuTransition: {
    MRipple: import("vue").DefineComponent<{
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
        createRipple: (rippleAttrs: {
            size: number;
            pos: {
                x: number;
                y: number;
            };
        }) => any;
        handleMouseUp: <Y>(e: ({
            EvReturnT: void;
            onMouseDownE: any;
            onMouseUpE: any;
            onBubbleE: any;
            handleMouseClick: (e: any) => void;
            handleMouseUp: (e: any) => void;
            onBubble: (e: any) => void;
        } & ((Y extends HTMLElement ? Y : HTMLElement) extends infer T ? T extends (Y extends HTMLElement ? Y : HTMLElement) ? T extends HTMLElement ? any : unknown : never : never))["onMouseUpE"]) => void;
        handleMouseClick: <Z>(e: ({
            EvReturnT: void;
            onMouseDownE: any;
            onMouseUpE: any;
            onBubbleE: any;
            handleMouseClick: (e: any) => void;
            handleMouseUp: (e: any) => void;
            onBubble: (e: any) => void;
        } & ((Z extends HTMLElement ? Z : HTMLElement) extends infer T_1 ? T_1 extends (Z extends HTMLElement ? Z : HTMLElement) ? T_1 extends HTMLElement ? any : unknown : never : never))["onMouseDownE"]) => void;
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
    Expand: import("vue").DefineComponent<{
        isRun: {
            type: BooleanConstructor;
            default: boolean;
        };
    }, {
        selfRef: import("vue").Ref<HTMLElement | null>;
        MTExpand: {
            _EXP_DURATION_: number;
            transition: {
                transition: string;
            };
        };
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        isRun: {
            type: BooleanConstructor;
            default: boolean;
        };
    }>>, {
        isRun: boolean;
    }, {}>;
    Bound: import("vue").DefineComponent<{
        duration2: {
            type: NumberConstructor;
            default: number;
        };
        active: {
            type: BooleanConstructor;
            default: boolean;
        };
    }, {
        boundingRef: import("vue").Ref<HTMLElement | Text | null>;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("notifyEntered" | "notifyEnded")[], "notifyEntered" | "notifyEnded", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        duration2: {
            type: NumberConstructor;
            default: number;
        };
        active: {
            type: BooleanConstructor;
            default: boolean;
        };
    }>> & {
        onNotifyEntered?: ((...args: any[]) => any) | undefined;
        onNotifyEnded?: ((...args: any[]) => any) | undefined;
    }, {
        duration2: number;
        active: boolean;
    }, {}>;
};
export interface MElement extends HTMLElement {
    $miku_width?: HTMLElement['scrollWidth'];
    $miku_height?: HTMLElement['scrollHeight'];
}
export default MikuTransition;
