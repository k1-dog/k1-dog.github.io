import classNames from 'classnames'
import M9Icon from '../M9-Style/assets/_'
import { MTableHeader, MTColumnT, THCls, TCellCls } from './Type'
import { PropType, defineComponent, inject } from 'vue'
import { _calcFixedOffsetStyle } from './THook'
import { M9CloneDeep, M9Dragger } from '../M9-Utils'

export default defineComponent({
  name: 'M9TableHeader',
  props: {
    MTableHeadColumns: {
      type: Array as PropType<MTableHeader['MTableColumns']>,
      default: () => []
    }
  },
  emits: ['refreshM9Columns'],
  setup(props, ctx) {
    // * 获取可能存在的 各列浮动配置信息Map对象
    const _fixedOffsetValue: any = inject('_fixedOffsetValue')
    // 处理表头单元格上的数据排序点击事件
    function handleSort (column: MTColumnT) {
      return
    }
    // 处理表头单元格上的过滤筛选点击事件
    function handleFilter (column: MTColumnT) {
      return
    }
    // 处理表头单元格的列宽拖拽事件
    function handleDrag ({ dragKey, nextWidth = 0, nextHeight = 0, offsetX = 0, offsetY = 0 }) {
      const _cloneM9Columns = M9CloneDeep(props.MTableHeadColumns)
      const dragColumn = _cloneM9Columns.find(headColumn => headColumn.key === dragKey)!
      dragColumn.width = nextWidth
      // ? 注意重新计算一遍 _fixedOffsetValue 浮动列的偏移位置值, 因为拖拽浮动列宽度的时候, 这个每个浮动列的偏移值肯定会受到影响
      ctx.emit('refreshM9Columns', _cloneM9Columns)
      return
    }
    /**
     * @function [__renderMTHC]
     * @see [渲染美九表格头部每个单元格粒度]
     * @param {Object} MTHC
     * @returns {JSX.Element}
     */
    function __renderMTableHeadCell (MColumn: MTColumnT, MCell_SeqNo: number) {
      const { key, title, fixed, sortable, filterable } = MColumn

      const MTHC_CTT = [
        <span>{title}</span>
      ]

      if (sortable) {
        MTHC_CTT.push(
          (
          <span className={`${TCellCls}--sort`}>
            {/* <i>sort icon</i> */}
            <M9Icon icon="sortable" style="width: 18px;" onClick={() => handleSort(MColumn)}></M9Icon>
          </span>
          )
        )
      }
      if (filterable) {
        MTHC_CTT.push(
          (
          <span className={`${TCellCls}--filter`}>
            {/* <i>filter icon</i> */}
            <M9Icon icon="search" style="width: 18px;" onClick={() => handleFilter(MColumn)}></M9Icon>
          </span>
          )
        )
      }

      const _TCellCls = classNames(TCellCls, { [`${TCellCls}--fixed`]: !!fixed, [`${TCellCls}--fixed--${fixed}`]: !!fixed })

      const dragger_class = classNames({ [`${TCellCls}-dragger--fixed--${fixed}`]: !!fixed, [`${TCellCls}--fixed--${fixed}`]: !!fixed })
      
      const _style = _calcFixedOffsetStyle(MColumn, _fixedOffsetValue.value, -1)
      // ! 这里注意一下, 浮动列 zIndex 要比 非浮动列 zIndex 多点儿, 要不浮动的固定列就被非浮动列覆盖住了
      // ? 具体啥原因不太清楚, 之前没包裹拖拽元素的时候, 就算 zIndex 一致也没影响
      const dragger_style = { position: 'sticky', zIndex: !fixed ? 3 : 4, ..._style}

      return (
      <M9Dragger drag-key={key} isRight onDragend={handleDrag} className={dragger_class} style={dragger_style}>
        {
          {
            default: () => <th key={key} className={_TCellCls}>{MTHC_CTT}</th> // style={_style}
          }
        }
      </M9Dragger>
      )
    }

    /**
     * @function [__renderMTHC]
     * @see [渲染美九表格头部内容]
     * @param {Object} MTHC
     * @returns {JSX.Element}
     */
    function renderMTableHeader ($MTableHeadColumns: MTableHeader['MTableColumns']) {
      return (
        <tr>
          {
            $MTableHeadColumns.map((column: MTColumnT, col_i: number) => {
              return __renderMTableHeadCell(column, col_i)
            })
          }
        </tr>
      )
    }

    return { renderMTableHeader }
  },

  render () {
    const { MTableHeadColumns } = this.$props
    const { style } = this.$attrs

    const { renderMTableHeader } = this
    const THeadCls = classNames(THCls)

    return (
      <thead className={THeadCls} style={style}>
        { renderMTableHeader(MTableHeadColumns as any) }
      </thead>
    )
  }
})