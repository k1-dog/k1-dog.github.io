interface MTColumnBaseProps {
    key: string | number;
    /**
     * @description [每列表头 - 描述信息]
     */
    title?: string;
    /**
    * @description [每列宽度]
    */
    width?: number;
}
interface MTColumnExtProps {
    fixed: true | 'left' | 'right';
    sortable: boolean;
    filterable: boolean;
    selectable: boolean;
    isTreeNode: boolean;
    /**
     * @description [单元格类型 -/过滤型 | -/多选型 | -/排序型]
     */
    type: string;
    formatter: (O: {
        rowData: any;
        value: any;
    }) => any;
}
export type MTColumnT = {
    key: string;
} & Partial<MTColumnExtProps> & MTColumnBaseProps;
export type MTColumnsT = Array<MTColumnT>;
export interface MTableHeader {
    MTableColumns: MTColumnsT;
    style?: {
        [key: string]: number;
    };
}
export interface MTableBody {
    /**
     * @param {真正在美九表格体中显示的格子对应 KEY 列表}
     */
    MTBodyColumns: MTColumnsT;
    MTDataSource: any[];
    style?: Object;
}
export interface MTableProps extends MTableHeader {
    MKey: string;
    MTRowHeight: number;
    MikuDataSource: any[];
    MTScroll?: {
        [key: string]: number;
    };
}
export declare const preCls = "miku-table";
export declare const THCls: string;
export declare const TBCls: string;
export declare const TCellCls: string;
export {};
