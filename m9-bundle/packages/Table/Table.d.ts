import { MTableProps } from './Type';
import { PropType } from 'vue';
declare const _default: import("vue").DefineComponent<{
    MTableColumns: {
        type: PropType<import("./Type").MTColumnsT>;
        default: () => never[];
    };
    MikuDataSource: {
        type: PropType<any[]>;
        default: () => never[];
    };
    MTRowHeight: {
        type: PropType<number>;
        default: number;
    };
    MKey: {
        type: PropType<string>;
        default: string;
    };
    MTScroll: {
        type: PropType<{
            [key: string]: number;
        } | undefined>;
        default: () => {
            x: number;
            h: number;
        };
    };
}, {
    state: {
        M9Columns: {
            key: string;
            fixed?: true | "left" | "right" | undefined;
            sortable?: boolean | undefined;
            filterable?: boolean | undefined;
            selectable?: boolean | undefined;
            isTreeNode?: boolean | undefined;
            type?: string | undefined;
            formatter?: ((O: {
                rowData: any;
                value: any;
            }) => any) | undefined;
            title?: string | undefined;
            width?: number | undefined;
        }[];
        M9Data: MTableProps['MikuDataSource'];
    };
    tableRef: import("vue").Ref<any>;
    viewportRef: import("vue").Ref<any>;
    onRefreshM9Data: (callNewM9Data: any) => void;
    onRefreshM9Columns: (newM9Columns: any) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    MTableColumns: {
        type: PropType<import("./Type").MTColumnsT>;
        default: () => never[];
    };
    MikuDataSource: {
        type: PropType<any[]>;
        default: () => never[];
    };
    MTRowHeight: {
        type: PropType<number>;
        default: number;
    };
    MKey: {
        type: PropType<string>;
        default: string;
    };
    MTScroll: {
        type: PropType<{
            [key: string]: number;
        } | undefined>;
        default: () => {
            x: number;
            h: number;
        };
    };
}>>, {
    MikuDataSource: any[];
    MTableColumns: import("./Type").MTColumnsT;
    MKey: string;
    MTRowHeight: number;
    MTScroll: {
        [key: string]: number;
    } | undefined;
}, {}>;
export default _default;
