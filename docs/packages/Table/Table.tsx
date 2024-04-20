import { MTableProps, preCls } from './Type'
import MTableHeader from './TableHeader'
import MTableBody from './TableBody'
import M9VScroller from '../VScroller/index'
import { PropType, defineComponent, onBeforeMount, provide, ref, reactive, watch, onMounted } from 'vue'
import { _makeBetterAttributesInColumns, _rebuildBetterColumns, _calcFixedOffsetValue, TableScrollXWidth, M9TableHHeight, _makeBetterAttributesInData } from './THook'
import { M9CloneDeep, T2A } from '../M9-Utils/index'

export default defineComponent({
  name: 'M9Table',
  props: {
    MTableColumns: {
      type: Array as PropType<MTableProps['MTableColumns']>,
      default: () => []
    },
    MikuDataSource: { // ? MTBData
      type: Array as PropType<MTableProps['MikuDataSource']>,
      default: () => []
    },
    MTRowHeight: {
      type: Number as PropType<MTableProps['MTRowHeight']>,
      default: 50
    },
    MKey: {
      type: [String, Number] as PropType<MTableProps['MKey']>,
      default: 'id'
    },
    MTScroll: {
      type: Object as PropType<MTableProps['MTScroll']>,
      default: () => ({ x: TableScrollXWidth, h: 400 })
    }
  },
  setup(props, ctx) {
    // 全表数据源 - 备份数据, 用来处理表格 筛选 | 显隐 | 排序后, 数据再还原时, 找不到原始数据的问题
    // <其实相当于就是个备份, 为了方便还原消失的数据> - 这份数据永远不变, immutable
    let _storeData: MTableProps['MikuDataSource'] = []

    let _isMounted = false
    const tableRef = ref()
    const viewportRef = ref()

    const state = reactive<{ M9Columns: MTableProps['MTableColumns'], M9Data: MTableProps['MikuDataSource'] }>({
      M9Columns: [],
      M9Data: []
    })

    function reComputeFixedOffsetValue () {
      _fixedOffsetValue.value = _calcFixedOffsetValue(state.M9Columns)
    }
    const _fixedOffsetValue = ref({})
    provide('_fixedOffsetValue', _fixedOffsetValue)

    // ? 处理可能存在的树形数据 - 展示成树表结构
    function _flattenTreeToArray (treeData) {
      return T2A(treeData)
    }

    // * 计算属性 --
    // 1.联动计算 isHidden 隐藏\显示的元素
    // 2.联动计算 filtered 过滤的元素
    // 3.联动计算 sortable 排序的元素

    onBeforeMount(() => {
      state.M9Columns = _makeBetterAttributesInColumns(props.MTableColumns)
      _storeData = _makeBetterAttributesInData(_flattenTreeToArray(props.MikuDataSource))
      state.M9Data = M9CloneDeep(_storeData)
    })

    onMounted(() => {
      reComputeFixedOffsetValue()
      _isMounted = true
    })

    function onRefreshM9Columns (newM9Columns) {
      state.M9Columns = newM9Columns || [...state.M9Columns]
    }
    watch(() => state.M9Columns, (newM9Columns) => {
      if (_isMounted) {
        reComputeFixedOffsetValue()
      }
    })
    function onRefreshM9Data (callNewM9Data) {
      // callNewM9Data - 这是个回调函数, 因为 处理表格数据的方法很多, 主要有 排序 | 过滤 | 显隐,
      // 我不是很想把这些方法 全集成在 Table 这个主上层组件里, 我把具体处理步骤分散到 TableBody 组件里, 为 Table 代码瘦身
      // 然后 Table 只是为 TableBody 的这个回调函数 提供回调参数 (一个真正需要被渲染到页面展示的 state.M9Data) 和 (另一个初始化时就备份好的全量数据源)
      const newM9Data = callNewM9Data && callNewM9Data(state.M9Data, _storeData)
      // 这里重新执行一遍 _makeBetterAttributesInData 方法, 是为了重新为每一行数据 标记最新 no序号
      state.M9Data = _makeBetterAttributesInData(newM9Data)
    }
    // watch(() => state.M9Data, (newM9Data) => {})

    return { state, tableRef, viewportRef, onRefreshM9Data, onRefreshM9Columns }
  },
  render () {
    const {
      state: { M9Columns, M9Data },
      onRefreshM9Data,
      onRefreshM9Columns,
      $props: { MTRowHeight, MTScroll, MKey }
    } = this

    const viewportCls = `${preCls}--viewport`

    const scrollStyle = {
      width: `${MTScroll!.x}px`,
      height: `${MTScroll!.h}px`
    }

    return (
      <div style={scrollStyle} className={viewportCls} ref={(_winR_: any) => this.viewportRef = _winR_}>
        <table
          ref={(_Tref_: any) => this.tableRef = _Tref_}
          className={preCls}
          cellPadding={0}
          cellSpacing={0}
          style={{ borderCollapse: 'separate', borderSpacing: 0, border: 0, margin: 0, padding: 0 }}
        >
          {
            [
              <MTableHeader MTableHeadColumns={M9Columns} onRefreshM9Columns={onRefreshM9Columns} style={{ height: `${M9TableHHeight}px` }} />,
              <M9VScroller vsElement={() => this.viewportRef} vsUnitHeight={MTRowHeight} data={M9Data}>
                {
                  {
                    default: (vsData: MTableProps['MikuDataSource']) => {
                      return <MTableBody MKey={MKey} MTableBodyColumns={M9Columns} MTDataSource={vsData} MTRowHeight={MTRowHeight} onRefreshM9Data={onRefreshM9Data} />
                    }
                  }
                }
              </M9VScroller>
            ]
          }
        </table>
      </div>
    )
  }
})
