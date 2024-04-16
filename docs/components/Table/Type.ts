interface MTColumnBaseProps {
  key: string | number; // ? 每列的唯一标识 key 值, 这个必须得有了吧
  /**
   * @description [每列表头 - 描述信息]
   */
  title?: string;

  /**
  * @description [每列宽度]
  */
  width?: number;
};

interface MTColumnExtProps {
  fixed: true | 'left' | 'right';
  sortable: boolean;
  filterable: boolean;
  selectable: boolean;
  isTreeNode: boolean; // ? 是否为树表中 - 指定展开属性
  /**
   * @description [单元格类型 -/过滤型 | -/多选型 | -/排序型]
   */
  type: string;
  formatter: (O: { rowData: any, value: any }) => any // ? 有时候 - 单元格显示的内容需要自定义显示值, 所以传入这样一个回显值的自定义回调函数
};

export type MTColumnT = {
  key: string
} & Partial<MTColumnExtProps> & MTColumnBaseProps;

export type MTColumnsT = Array<MTColumnT>;

export interface MTableHeader {

  MTableColumns: MTColumnsT;

  style?: {
    [key: string]: number
  }
};

export interface MTableBody {
  /**
   * @param {真正在美九表格体中显示的格子对应 KEY 列表}
   */
  MTBodyColumns: MTColumnsT;

  MTDataSource: any[];

  style?: Object;
};

export interface MTableProps extends MTableHeader {
  MKey: string;
  MTRowHeight: number;
  MikuDataSource: any[];
  MTScroll?: { [key: string]: number };
};

export const preCls = 'miku-table';

export const THCls = `${preCls}__head`; // * 表格头部样式类名

export const TBCls = `${preCls}__body`; // * 表格身部样式类名

export const TCellCls = `${preCls}__cell`; // * 单元格样式类名
