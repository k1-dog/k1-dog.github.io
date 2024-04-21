import { Ref } from 'vue';
export interface MikuBoundProps {
    /**
     * 动画持续时长 (外设)
     * @param {number} duration
     */
    duration2: number;
    /**
     * 激活开关 @param {boolean} active
     */
    active: boolean;
}
export interface MikuBoundState {
}
declare const _default: import("vue").DefineComponent<{
    duration2: {
        type: NumberConstructor;
        default: number;
    };
    active: {
        type: BooleanConstructor;
        default: boolean;
    };
}, {
    boundingRef: Ref<HTMLElement | Text | null>;
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
export default _default;
