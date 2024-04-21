import { PropType, Ref } from "vue";
type MS_OPT = {
    MSVal: number | string;
    MSLabel: any;
    selected: boolean;
};
type MS_OPTS = MS_OPT[];
export interface MSelectProps {
    /**
     * @description 下拉框中 内容合集 [字符数组类型]
     */
    options: Array<{
        label: string;
        value: any;
    }>;
    /**
     * @description 开启多选标记
     */
    multiable?: boolean;
    /**
     * @description 开启过滤筛选开关
     */
    filterable?: boolean;
    replaceFields: {
        value: string;
        label: string;
    };
    /**
     * @description 实现双向数据绑定的回调
     */
    onSelect?: (select: MS_OPT | MS_OPTS) => void;
    /**
     * @description 开启__filter-option__属性时::需要传递一个过滤回调Fn
     */
    onFilter?: (opt: MS_OPT, searchV: string) => boolean | void;
}
interface MSelectState {
    /**
     * @description 下拉框显示标记
     */
    selectPanelVisible: boolean;
    /**
     * @description 下拉框组件中 内部输入框的值
     */
    innerVal?: MS_OPT;
    /**
     * @description 多选状态时的值组
     */
    valGroup?: MS_OPTS;
    /**
     * @see 下拉选择框__STAT__位置、宽度元素信息
     */
    select$stat: object;
    /**
     * @see 美九下拉框__内部下拉选项的<值组>__维护机
     */
    options_1: MS_OPTS;
}
declare const _default: import("vue").DefineComponent<{
    modelValue: {
        type: (StringConstructor | ArrayConstructor)[];
    };
    options: {
        type: PropType<{
            label: string;
            value: any;
        }[]>;
        default: () => never[];
    };
    multiable: {
        type: BooleanConstructor;
        default: boolean;
    };
    filterable: {
        type: BooleanConstructor;
        default: boolean;
    };
    replaceFields: {
        type: PropType<{
            value: string;
            label: string;
        }>;
        default: () => {
            value: string;
            label: string;
        };
    };
    onFilter: {
        type: PropType<((opt: MS_OPT, searchV: string) => boolean | void) | undefined>;
        default: () => boolean;
    };
}, {
    state: any;
    selectRef: Ref<HTMLElement | null>;
    optionsPanelRef: Ref<HTMLElement | null>;
    optionsPanelViewportRef: Ref<HTMLElement | null>;
    isSelectAll: import("vue").ComputedRef<0 | 1 | 2>;
    onSelectAll: () => void;
    onMultiSelect: (e: Event) => void;
    onHandleSelect: (e: Event) => void;
    onFilterOptions: (filteringVal?: String) => undefined;
    onChangeFilteringV: (filteringVal?: String) => void;
    onOpenSelectPanel: (cur_visible: boolean) => void;
    renderMultiSelectX: (playValueGroup: MSelectState['valGroup']) => Element;
    rowHeight: number;
    playValueGroup: import("vue").ComputedRef<any>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("filter" | "select" | "update:modelValue")[], "filter" | "select" | "update:modelValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    modelValue: {
        type: (StringConstructor | ArrayConstructor)[];
    };
    options: {
        type: PropType<{
            label: string;
            value: any;
        }[]>;
        default: () => never[];
    };
    multiable: {
        type: BooleanConstructor;
        default: boolean;
    };
    filterable: {
        type: BooleanConstructor;
        default: boolean;
    };
    replaceFields: {
        type: PropType<{
            value: string;
            label: string;
        }>;
        default: () => {
            value: string;
            label: string;
        };
    };
    onFilter: {
        type: PropType<((opt: MS_OPT, searchV: string) => boolean | void) | undefined>;
        default: () => boolean;
    };
}>> & {
    onSelect?: ((...args: any[]) => any) | undefined;
    "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
    onFilter?: ((...args: any[]) => any) | undefined;
}, {
    replaceFields: {
        value: string;
        label: string;
    };
    options: {
        label: string;
        value: any;
    }[];
    onFilter: ((opt: MS_OPT, searchV: string) => boolean | void) | undefined;
    multiable: boolean;
    filterable: boolean;
}, {}>;
export default _default;
