import { PropType } from 'vue';
export interface ButtonHandleClick {
    <E3, R>(e?: E3, ...restArgs: R[]): any;
}
export type btnTypes = 'main' | 'pure' | 'danger' | 'mirai' | 'k1';
export type sizeTypes = 'small' | 'medium' | 'large';
export type shapeTypes = 'circle' | 'square';
export interface ButtonProps {
    /**
     * @param {string | undefined} type <按钮类型>
     */
    type?: btnTypes;
    /**
     * @param {string | undefined} shape <按钮形状>
     */
    shape?: shapeTypes;
    /**
     * @param {string | undefined} size <按钮大小>
     */
    size?: sizeTypes;
    /**
     * @param {string | undefined} disabled <禁用标志>
     */
    disabled: boolean | undefined;
    /**
     * @param {string | undefined} loading <加载标志>
     */
    loading: boolean | undefined;
    /**
     * @function any <onClick>
     */
    [k: string]: any;
}
declare const _default: import("vue").DefineComponent<{
    type: {
        type: PropType<btnTypes | undefined>;
        default: string;
    };
    shape: {
        type: PropType<shapeTypes | undefined>;
        default: string;
    };
    size: {
        type: PropType<sizeTypes | undefined>;
        default: string;
    };
    disabled: {
        type: PropType<boolean | undefined>;
        default: boolean;
    };
    loading: {
        type: PropType<boolean | undefined>;
        default: boolean;
    };
}, {
    buttonEle: null;
    onHandleClick: Function;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    type: {
        type: PropType<btnTypes | undefined>;
        default: string;
    };
    shape: {
        type: PropType<shapeTypes | undefined>;
        default: string;
    };
    size: {
        type: PropType<sizeTypes | undefined>;
        default: string;
    };
    disabled: {
        type: PropType<boolean | undefined>;
        default: boolean;
    };
    loading: {
        type: PropType<boolean | undefined>;
        default: boolean;
    };
}>>, {
    size: sizeTypes | undefined;
    type: btnTypes | undefined;
    shape: shapeTypes | undefined;
    disabled: boolean | undefined;
    loading: boolean | undefined;
}, {}>;
export default _default;
