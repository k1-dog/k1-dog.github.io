import { MTColumnT, MTColumnsT, MTableProps } from "./Type"
import { M9CloneDeep } from "../M9-Utils"
import { CSSProperties } from "vue"

// ! 固定美九表头高度 - 用以后期实现纵向虚拟滚动, 且辅助表头表身的同步横向滚动行为, 可以安心的让滚动行为在 大 <table> 标签下设计了
export const M9TableHHeight = 35

// ! 定义表格可视窗口的最大宽度 - 用以横向滚动条展示 及 表格右浮动列的右侧极值计算
// ? (这个很关键, 头疼了半天 - 发现表格右浮动的列 left或right 偏移量不能超过可视窗口的宽度)
export const TableScrollXWidth = 800

// * 表头列配置的属性扩充方法 - 补全 width 等必须属性信息, 否则会影响部分表格功能的设计
// ? 顺带填充一个 序号列
export function _makeBetterAttributesInColumns (MTColumns: MTColumnsT) {
  const _defaultAttributesValue = {
    width: 100
  }
  const _defaultNoColumn: MTColumnT = {
    key: 'no',
    fixed: 'left',
    width: 40,
    title: '--',
    formatter: ({ rowData, value: no }) => no + 1
  }
  const MTColumns_2: MTColumnsT = M9CloneDeep(MTColumns)
  MTColumns_2.unshift(_defaultNoColumn)
  for (let _i = 0; _i < MTColumns_2.length; _i++) {
    const MTColumn = MTColumns_2[_i]
    MTColumn.width = MTColumn.width || _defaultAttributesValue['width']
    MTColumn.formatter = MTColumn.formatter && MTColumn.formatter || (({ rowData, value: v }) => v)
  }

  return MTColumns_2
}
// * 表身源数据的属性扩充方法 - 补全 isCollapse isHidden no 属性信息, 否则影响树表结构部分功能设计
export function _makeBetterAttributesInData (MTData: MTableProps['MikuDataSource']) {
  const _m9CloneData = M9CloneDeep(MTData)
  for (let _g = 0; _g < _m9CloneData.length; _g++) {
    const row = _m9CloneData[_g]
    row.no = _g
    if (!('isHidden' in row)) {
      row.isHidden = false
    }
    if (!('isCollapse' in row)) {
      row.isCollapse = false
    }
  }

  return _m9CloneData
}

// * 表头重新生成算法 (由于列存在 -浮动-排序-筛选-隐藏- 等功能), 需要辅助表头数组重新配置
export function _rebuildBetterColumns (MTColumns: MTColumnsT) {
  const MTColumns_2: MTColumnsT = M9CloneDeep(MTColumns)
  function computeFixedColumns (Columns0: MTColumnsT) {
    const __leftColumns = Columns0.filter(column => column.fixed === 'left')
    const __commonColumns = Columns0.filter(column => !column.fixed)
    const __rightColumns = Columns0.filter(column => column.fixed === 'right').reverse()

    const fiexdColumns = __leftColumns.concat(__commonColumns).concat(__rightColumns)
    return fiexdColumns
  }
  function computeSortedColumns (FixedColumns) {
    return FixedColumns
  }
  function computeHiddenColumns (SortedColumns) {
    return SortedColumns
  }
  // ? 1.- 先计算浮动表头
  const _fixedColumns = computeFixedColumns(MTColumns_2)
  // ? 2.- 再计算排序表头
  const _sortedColumns = computeSortedColumns(_fixedColumns)
  // ? 3.- 再计算隐藏表头
  const _hiddenColumns = computeHiddenColumns(_sortedColumns)

  return _hiddenColumns
}

// * 计算每个浮动列的浮动距离
export function _calcFixedOffsetValue (MTColumns: MTColumnsT) {
  return MTColumns.reduce(($Map, column) => {
    const { key, fixed, width } = column
    if (!!fixed) {
      if (fixed === 'left') {
        if ($Map.isFirstLeft === true) {
          $Map.isFirstLeft = false
          $Map.leftMap[key] = 0
        } else {
          $Map.leftMap[key] = $Map.leftTotalOffset
        }

        $Map.leftTotalOffset += width!
      } else if (fixed === 'right') {
        $Map.rightTotalOffset += width!
        if ($Map.isFirstRight === true) {
          $Map.isFirstRight = false
          $Map.rightMap[key] = width
        } else {
          $Map.rightMap[key] = $Map.rightTotalOffset
        }
      }
    }
    
    return $Map
  }, { isFirstLeft: true, leftMap: {}, leftTotalOffset: 0, isFirstRight: true, rightMap: {}, rightTotalOffset: 0 })
}

// * 计算每个浮动列的浮动样式 - 根据其生成的浮动距离得到
export function _calcFixedOffsetStyle (MTColumn: MTColumnT, _fixedOffsetValue, rowLevel: number = 0) {
  const { fixed, key, width } = MTColumn

  // ? 顺带处理下 - 树表缩进 padding 值
  let _style: CSSProperties = { 'min-width': `${width}px`, 'paddingLeft': `${(rowLevel + 1) * 25}px` }

  if (fixed === 'left') {
    _style.left = _fixedOffsetValue['leftMap'] && `${_fixedOffsetValue['leftMap'][key]}px` || undefined
  } else if (fixed === 'right') {
    _style.right = _fixedOffsetValue['rightMap'] && `${_fixedOffsetValue['rightTotalOffset'] - _fixedOffsetValue['rightMap'][key]}px` || undefined
  }

  return _style
}
