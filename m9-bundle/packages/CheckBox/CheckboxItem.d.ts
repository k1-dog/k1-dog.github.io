import { PropType } from 'vue';
export interface MCheckItemProps {
    disabled: boolean;
    replaceFields: {
        [key: string]: string;
    };
}
declare const _default: import("vue").DefineComponent<{
    disabled: {
        type: PropType<boolean | undefined>;
        default: boolean;
    };
    replaceFields: {
        type: PropType<{
            [key: string]: string;
        } | undefined>;
        default: () => {};
    };
    checked: {
        type: PropType<boolean | 0 | 1 | 2>;
        default: boolean;
    };
    mKey: {
        type: PropType<string | number>;
        default: string;
    };
    value: {
        type: (ObjectConstructor | StringConstructor | NumberConstructor)[];
        required: false;
        default: null;
    };
}, {
    onItemChange: (k: any) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "change"[], "change", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    disabled: {
        type: PropType<boolean | undefined>;
        default: boolean;
    };
    replaceFields: {
        type: PropType<{
            [key: string]: string;
        } | undefined>;
        default: () => {};
    };
    checked: {
        type: PropType<boolean | 0 | 1 | 2>;
        default: boolean;
    };
    mKey: {
        type: PropType<string | number>;
        default: string;
    };
    value: {
        type: (ObjectConstructor | StringConstructor | NumberConstructor)[];
        required: false;
        default: null;
    };
}>> & {
    onChange?: ((...args: any[]) => any) | undefined;
}, {
    disabled: boolean | undefined;
    replaceFields: {
        [key: string]: string;
    } | undefined;
    checked: boolean | 0 | 1 | 2;
    mKey: string | number;
    value: string | number | Record<string, any>;
}, {}>;
export default _default;
