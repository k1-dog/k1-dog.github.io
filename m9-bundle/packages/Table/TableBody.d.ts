import { MTableBody } from './Type';
import { PropType } from 'vue';
declare const _default: import("vue").DefineComponent<{
    MTDataSource: {
        type: PropType<any[]>;
        default: () => never[];
    };
    MTableBodyColumns: {
        type: PropType<import("./Type").MTColumnsT>;
        default: () => never[];
    };
    MTRowHeight: {
        type: NumberConstructor;
        default: number;
    };
    MKey: {
        type: PropType<string>;
        default: string;
    };
}, {
    renderMTableBody: (MTableData: MTableBody['MTDataSource']) => any[];
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "refreshM9Data"[], "refreshM9Data", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    MTDataSource: {
        type: PropType<any[]>;
        default: () => never[];
    };
    MTableBodyColumns: {
        type: PropType<import("./Type").MTColumnsT>;
        default: () => never[];
    };
    MTRowHeight: {
        type: NumberConstructor;
        default: number;
    };
    MKey: {
        type: PropType<string>;
        default: string;
    };
}>> & {
    onRefreshM9Data?: ((...args: any[]) => any) | undefined;
}, {
    MTDataSource: any[];
    MKey: string;
    MTableBodyColumns: import("./Type").MTColumnsT;
    MTRowHeight: number;
}, {}>;
export default _default;
