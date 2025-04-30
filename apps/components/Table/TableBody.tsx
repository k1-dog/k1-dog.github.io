import classNames from 'classnames'
import { MTableProps, MTableBody, MTColumnT, TBCls, TCellCls } from './Type'
import { defineComponent, inject, PropType, TransitionGroup } from 'vue'
import { _calcFixedOffsetStyle } from './THook'
import M9Icon from '@k1/styles/assets/_'
import { M9CloneDeep } from '@k1/utils'

export default defineComponent({
  name: 'M9TableBody',
  props: {
    MTDataSource: {
      type: Array as PropType<MTableBody['MTDataSource']>,
      default: () => []
    },
    MTableBodyColumns: {
      type: Array as PropType<MTableBody['MTBodyColumns']>,
      default: () => []
    },
    MTRowHeight: {
      type: Number,
      default: 40
    },
    MKey: {
      type: [String, Number] as PropType<MTableProps['MKey']>,
      default: 'id'
    }
  },
  emits: ['refreshM9Data'],
  setup(props, ctx) {
    // * 获取可能存在的 各列浮动配置信息Map对象
    const _fixedOffsetValue: any = inject('_fixedOffsetValue')

    function onCollapseRow(rowData) {
      // ! 注意这里 - 使用虚拟滚动一直截取出来的局部数据, 所以有可能按索引寻找会找不到
      // ? 定义回调事件, 把源始整表数据回调进来, 对源始大表进行索引查找 就不会出错了--
      const callHandleMDataSource = ($m9DataState, $_storeData) => {
        const _m9CloneData = M9CloneDeep($m9DataState)

        const { no, childrenLength, isCollapse } = rowData

        // 对 源始备份大表 进行数据信息的同步, 是哪个元素进行的折叠操作, 就对对应的源始元素同步一下 isCollapse 属性值
        // 避免因 大表数据源 和 被渲染数据源 信息不同步, 造成的后期不可控 bug 产生
        function m9DataBeSameWithStoreData () {}

        const _storeRowData = $_storeData[no]
        _storeRowData.isCollapse = !isCollapse
        $_storeData[no] = _storeRowData

        const _rowData = _m9CloneData[no]
        _rowData.isCollapse = !isCollapse
        _m9CloneData[no] = _rowData

        function commonIsCollapseControl ($trusyChildSonDataLength) {
          for (let _i = no + 1; _i <= no + $trusyChildSonDataLength; _i++) {
            const _storeChildSonRowData = $_storeData[_i]
            _storeChildSonRowData.isHidden = $_storeData[no].isCollapse
            $_storeData[_i] = _storeChildSonRowData

            const _rowChildSonData = _m9CloneData[_i]
            _rowChildSonData.isHidden = _m9CloneData[no].isCollapse
            _m9CloneData[_i] = _rowChildSonData
          }
        }
        // * 如果当前操作为折叠行 - 那么需要 [删除] 该节点下边 所有的子孙节点 <而且是正在展示的节点 即筛选 isHidden = false  的节点>
        // ! 注意 -
        if (_storeRowData.isCollapse) {
          const trusyChildSonWillHiddenData = $_storeData.slice(no + 1, no + 1 + childrenLength).filter(storeRowData => storeRowData.isHidden === false)
          const trusyChildSonWillHiddenDataLength = trusyChildSonWillHiddenData.length
          // 标记其下子孙节点 isHidden = true -> 隐藏
          commonIsCollapseControl(trusyChildSonWillHiddenDataLength)
          
          _m9CloneData.splice(no + 1, trusyChildSonWillHiddenDataLength)
        }
        // * 如果当前操作为展开行 - 那么需要 [添加] 该节点下边 所有的子孙节点 <而且是被隐藏的 即筛选 isHidden = true 的节点>
        // ! 注意 - 上述操作有问题, 直接子级节点必须展开, 必须 isHidden = true 才是对的, 这个后续再处理吧, 现在我添加的这些属性不足以支撑这一功能设计 <主要找不到直接子级节点, 后边我估计我要处理 key值拼接了, 拼接个父级前缀标识, 通过提取前缀标识找寻是不是直接子级>
        else {
          const trusyChildSonWillShowData = $_storeData.slice(no + 1, no + 1 + childrenLength).filter(storeRowData => storeRowData.isHidden === true)
          const trusyChildSonWillShowDataLength = trusyChildSonWillShowData.length
          // 标记其下子孙节点 isHidden = false -> 显示
          commonIsCollapseControl(trusyChildSonWillShowDataLength)

          _m9CloneData.splice(no + 1, 0, ...trusyChildSonWillShowData)
        }

        return _m9CloneData
      }
      ctx.emit('refreshM9Data', callHandleMDataSource)
    }
    
    /**
     * @function [__renderMTBC]
     * @see [渲染美九表格主体每个单元格粒度]
     * @param {Object} MTBC
     * @returns {JSX.Element}
     */
    function __renderMTableBodyCell (rowData: any, MColumn: MTColumnT,  MCellSequenceNo: number) {
      const { level, childrenLength, isCollapse } = rowData
      const { key: ColKey, fixed, isTreeNode, formatter } = MColumn
      const MTHB_CTT = [
        isTreeNode
        &&
        childrenLength
        &&
        <M9Icon
          icon="collapse"
          style={`color: white; cursor: pointer; transition: transform 0.3s;transform: rotate(${isCollapse ? -90 : 0}deg)`}
          onClick={() => onCollapseRow(rowData)}
        ></M9Icon>
        || null,
        <span>{formatter!({ rowData, value: rowData[ColKey] })}</span>
      ]

      const _TCellCls = classNames(TCellCls, { [`${TCellCls}--fixed`]: !!fixed, [`${TCellCls}--fixed--${fixed}`]: !!fixed })
      
      const _style = _calcFixedOffsetStyle(MColumn, _fixedOffsetValue.value, level)

      return <td key={MCellSequenceNo} className={_TCellCls} style={_style}>{MTHB_CTT}</td>
    }

    /**
     * @function renderMTableBody
     * @description [渲染美九表格主体内容]
     * @param {Object} MTableData
     * @returns {JSX.Element}
     */
    function renderMTableBody (MTableData: MTableBody['MTDataSource']) {
      const { MTableBodyColumns, MTRowHeight } = props
      const ColNumOfRow = MTableBodyColumns.length
      return (
        // 加上这个 transition动画后, 如果不给 tr动画元素 加或没加上 key值的话, 列表滚动会异常的卡顿不流畅
        // <TransitionGroup name={`${TBCls}--animation`} tag="div" className={`${TBCls}--animation`}>
        // 这里的列表过渡动画 还挺难整 - 后续补充上吧
        // 而且树表 父节点展开与收起也有点儿不对劲 - 不能直接在网页上进行 display 显隐控制, 要对源始数组进行增删才行, 后续再改吧
        //   {
            MTableData.map((row: object, row_j: number) => {
              const { no } = row as any
              return (
                <tr key={no} style={{ height: `${MTRowHeight}px` }}>
                  {
                    MTableBodyColumns.map((column, col_k: number) => __renderMTableBodyCell(row, column, row_j * ColNumOfRow + col_k))
                  }
                </tr>
              )
            })
        //   }
        // </TransitionGroup>
      )
    }

    return { renderMTableBody }
  },
  render () {
    const { MTDataSource } = this.$props
    const { style } = this.$attrs

    const { renderMTableBody } = this

    return (
      <tbody className={TBCls} style={style}>
        { renderMTableBody(MTDataSource) }
      </tbody>
    )
  }
})