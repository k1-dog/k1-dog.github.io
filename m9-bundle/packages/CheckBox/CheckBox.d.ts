import { PropType } from 'vue';
export interface MCheckBoxInterface {
    options: any[];
    replaceFields: {
        [key: string]: string;
    };
}
type MCItem = {
    key: string | number;
    value: any;
    checked: boolean;
    disabled: boolean;
};
export interface MCheckBoxState {
    MCItems: MCItem[];
    /**
     * @description [留给二次开发人员 回调时所用到的已选择项目列表]
     */
    checkedItems?: any[];
    allCheckState: {
        isChecked: 0 | 1 | 2;
        onAllChecked: (isAll: boolean) => void;
    };
}
declare const CheckBox: import("vue").DefineComponent<{
    modelValue: {
        type: ArrayConstructor;
        default: () => never[];
    };
    options: {
        type: PropType<any[]>;
        default: () => never[];
    };
    replaceFields: {
        type: PropType<{
            [key: string]: string;
        }>;
        default: () => {
            key: string;
            value: string;
        };
    };
}, {
    state: {
        MCItems: {
            key: string | number;
            value: any;
            checked: boolean;
            disabled: boolean;
        }[];
        checkedItems?: any[] | undefined;
        allCheckState: {
            isChecked: 0 | 1 | 2;
            onAllChecked: (isAll: boolean) => void;
        };
    };
    onChecked: (MCIKey: MCItem['key']) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("change" | "update:modelValue")[], "change" | "update:modelValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    modelValue: {
        type: ArrayConstructor;
        default: () => never[];
    };
    options: {
        type: PropType<any[]>;
        default: () => never[];
    };
    replaceFields: {
        type: PropType<{
            [key: string]: string;
        }>;
        default: () => {
            key: string;
            value: string;
        };
    };
}>> & {
    onChange?: ((...args: any[]) => any) | undefined;
    "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
}, {
    replaceFields: {
        [key: string]: string;
    };
    options: any[];
    modelValue: unknown[];
}, {}>;
export default CheckBox;
