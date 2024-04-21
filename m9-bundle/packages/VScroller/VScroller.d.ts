import { PropType, Ref } from 'vue';
type M9VSDataT = Array<any>;
declare const _default: import("vue").DefineComponent<{
    vsElement: {
        type: PropType<() => HTMLElement>;
        default: () => HTMLDivElement;
    };
    vsUnitHeight: {
        type: PropType<number>;
        default: number;
    };
    vsStyle: {
        type: PropType<{
            x: number;
            h: number;
        }>;
        default: () => {
            x: number;
            h: number;
        };
    };
    data: {
        type: PropType<any[]>;
        default: () => never[];
    };
}, {
    vsData: import("vue").ComputedRef<M9VSDataT>;
    vsBarRef: Ref<any>;
    vsWindowRef: Ref<HTMLElement | null>;
    vsContentChildRef: Ref<any>;
    loading: Ref<boolean>;
    notifyObserveVS: () => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    vsElement: {
        type: PropType<() => HTMLElement>;
        default: () => HTMLDivElement;
    };
    vsUnitHeight: {
        type: PropType<number>;
        default: number;
    };
    vsStyle: {
        type: PropType<{
            x: number;
            h: number;
        }>;
        default: () => {
            x: number;
            h: number;
        };
    };
    data: {
        type: PropType<any[]>;
        default: () => never[];
    };
}>>, {
    data: any[];
    vsElement: () => HTMLElement;
    vsUnitHeight: number;
    vsStyle: {
        x: number;
        h: number;
    };
}, {}>;
export default _default;
