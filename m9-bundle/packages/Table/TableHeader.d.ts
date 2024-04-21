import { MTableHeader } from './Type';
import { PropType } from 'vue';
declare const _default: import("vue").DefineComponent<{
    MTableHeadColumns: {
        type: PropType<import("./Type").MTColumnsT>;
        default: () => never[];
    };
}, {
    renderMTableHeader: ($MTableHeadColumns: MTableHeader['MTableColumns']) => any;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "refreshM9Columns"[], "refreshM9Columns", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    MTableHeadColumns: {
        type: PropType<import("./Type").MTColumnsT>;
        default: () => never[];
    };
}>> & {
    onRefreshM9Columns?: ((...args: any[]) => any) | undefined;
}, {
    MTableHeadColumns: import("./Type").MTColumnsT;
}, {}>;
export default _default;
