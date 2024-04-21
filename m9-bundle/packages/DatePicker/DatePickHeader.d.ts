import { PropType, Ref } from 'vue';
export type _DateHeadType = any;
declare const _default: import("vue").DefineComponent<{
    MY: {
        type: PropType<number>;
    };
    MM: {
        type: PropType<number>;
    };
    MD: {
        type: PropType<number>;
    };
}, {
    onArrow: (e: Event) => undefined;
    dhRef: Ref<any>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "notifyUpdate"[], "notifyUpdate", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    MY: {
        type: PropType<number>;
    };
    MM: {
        type: PropType<number>;
    };
    MD: {
        type: PropType<number>;
    };
}>> & {
    onNotifyUpdate?: ((...args: any[]) => any) | undefined;
}, {}, {}>;
export default _default;
