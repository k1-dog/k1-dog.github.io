
import zhezhiImg from '@k1/styles/assets/image/zhezhi_02.webp'
import qinliImg from '@k1/styles/assets/image/kotori_01.webp'
import sansanImg from '@k1/styles/assets/image/kurumi_01.webp'
import meijiuImg from '@k1/styles/assets/image/miku.webp'

import M9ZzForm from './Form'
import { ZZV0 } from './use-validate'
import { defineComponent, reactive } from 'vue'

const zzFields = ['honor', 'overlord', 'like', 'jointime', 'score', 'face', '___1', 'kurumi', 'yoshino', '___2', 'kotori']

export function makeFormModel(formFieldNames) {
  return formFieldNames.reduce((Model, FieldName) => {
    if (FieldName === 'honor') {
      Model[FieldName] = {
        key: FieldName,
        label: '傲雪凌寒-' + FieldName,
        required: true,
        replaceFields: { label: 'name', value: 'value' },
        options: [
          { name: '天下无双 - 五河千代纸，天下第一骚客', value: '1' },
          { name: '颜值担当 - 狂三用高跟鞋踩我，我满脸开心', value: '3' },
          { name: '兄控担当 - 亲妹妹还不是不能结婚', value: '5' },
          { name: '元气担当 - 破军歌姬', value: '9' },
          ...Array.from({ length: 10 }, (_, _m) => {
            return { name: `想美九的第 {- ${_m} -} 天`, value: '5' + _m }
          })
        ],
        optionSlot: function eachItemSlot(OPTIONProp) {
          const currentItem = OPTIONProp.option

          const src =
            Number(currentItem.value) === 1
              ? zhezhiImg
              : Number(currentItem.value) === 3
              ? sansanImg
              : Number(currentItem.value) === 5
              ? qinliImg
              : meijiuImg
          return [
            <div class='flex align-items-center'>
              {(currentItem.value < 10 && <img style={{ float: 'left' }} width={28} src={src}></img>) || null}
              <span style={{ float: 'left' }}>{currentItem.name}</span>
            </div>
          ]
        },
        isFilter: true,
        isVirtual: true, // ? 开启虚拟滚动后, 选项的模糊匹配会局限于 当前可视选项数据范围内~~emmm想办法解决下这个问题
        type: 'SLT' // ? 选择框类型
      }
    } else if (FieldName === 'overlord') {
      Model[FieldName] = {
        key: FieldName,
        label: '傲雪凌寒-' + FieldName,
        required: true,
        replaceFields: { label: 'name', value: 'value' },
        options: [
          { name: 'Vampire 真祖 -夏提雅', value: '1' },
          { name: '脑补帝 大恶魔 -迪米乌哥斯', value: '7' },
          { name: '病娇 总管 -雅儿', value: '2' },
          { name: '最温柔的话语干最狠的事儿 -马雷小天使', value: '3' },
          ...Array.from({ length: 100 }, (_, _m) => {
            return { name: `吾乃侍奉无上至尊之人 {- ${_m} -} 号仆人`, value: '0' + '' + _m }
          })
        ],
        optionValue: (data) => data,
        optionSlot: function eachItemSlot(OPTIONProp) {
          const currentItem = OPTIONProp.option
          const src = zhezhiImg
          return [
            <div class='flex align-items-center'>
              {(currentItem.value < 10 && <img style={{ float: 'left' }} width={28} src={src}></img>) || null}
              <span style={{ float: 'left' }}>{currentItem.name}</span>
            </div>
          ]
        },
        valueSlot: function showValueSlot(VALUEProp) {
          const showingOptions = VALUEProp.value
          if (!!!showingOptions) {
            return null
          }

          const src = zhezhiImg
          const limitShowNumber = 6
          const couldShowsOf_6OPT = showingOptions.slice(0, limitShowNumber)
          return [
            <div class='flex flex-wrap'>
              {couldShowsOf_6OPT.map((eachOption) => (
                <div class='inline-flex align-items-center w-6'>
                  {<img width={28} src={src} />}
                  <span
                    class='pl-2 text-overflow-ellipsis w-12 overflow-hidden border-round-lg bg-bluegray-700 text-indigo-100'
                    title={eachOption.name}>
                    {eachOption.name}
                  </span>
                </div>
              ))}
            </div>,
            <div>
              {showingOptions.length > limitShowNumber && <span>......</span>}
              <span>+{showingOptions.length} 个全员恶人</span>
            </div>
          ]
        },
        isMulti: true,
        isFilter: true,
        // isVirtual: true, // ? 开启虚拟滚动后, 选项的模糊匹配会局限于 当前可视选项数据范围内~~emmm想办法解决下这个问题
        type: 'SLT' // ? 选择框类型
      }
    } else if (FieldName === 'like') {
      Model[FieldName] = {
        key: FieldName,
        label: '必须选择喜欢约战 -否则!不让假粉打分',
        required: true,
        type: 'SWITCH' // ? 开关切换类型
      }
    } else if (FieldName === 'jointime') {
      Model[FieldName] = {
        key: FieldName,
        label: '傲雪凌寒-' + FieldName,
        value: '2023-01-01',
        required: true,
        type: 'TIME' // ? 日期时间类型
      }
    } else if (FieldName === 'score') {
      Model[FieldName] = {
        key: FieldName,
        label: '傲雪凌寒-' + FieldName,
        value: 479,
        required: true,
        type: 'SLIDER' // ? 滑动条类型
      }
    } else if (FieldName === 'face') {
      Model[FieldName] = {
        key: FieldName,
        _class: 'col-12',
        label: '约会大作战-' + FieldName,
        required: true,
        onUpload: ({ files }) => {
          console.log('我已拥有这么多文件', files, ' ~~准备上传接口吧')
        },
        type: 'FILE' // ? 文件上传类型
      }
    } else if (FieldName.includes('___')) {
      Model[FieldName] = {
        label: '时崎狂三',
        type: 'DIVIDER' // ? 域控件之间的 分割线
      }
    } else if (FieldName === 'kotori') {
      Model[FieldName] = {
        key: FieldName,
        label: '傲雪凌寒-' + FieldName,
        required: true,
        type: 'CBOX-G',
        replaceFields: { key: 'boxKey', value: 'boxName' },
        options: [
          { boxKey: 'ICU-01', boxName: '一剑凌天诸雄败' },
          { boxKey: 'ICU-02', boxName: '笑傲红尘唯问天' },
          { boxKey: 'ICU-03', boxName: '花开生两面' },
          { boxKey: 'ICU-04', boxName: '人生佛魔间' },
          { boxKey: 'ICU-05', boxName: '傲雪凌风霜' },
          { boxKey: 'ICU-06', boxName: '双星护界神' },
          { boxKey: 'ICU-07', boxName: '傲雪凌寒、镜花水月' },
        ]
      }
    } else {
      Model[FieldName] = {
        key: FieldName,
        label: '傲雪凌寒-' + FieldName,
        required: FieldName !== 'yoshino',
        type: 'IPT' // ? 输入框类型
      }
    }

    return Model
  }, {})
}

export const ZzFormUI = defineComponent({
  name: 'TestZzForm',
  setup () {
    let ZVController
    const state = reactive({ formModel: makeFormModel(zzFields), formRules: {} })

    return { state, ZVController }
  },
  render () {
    const { state: { formModel, formRules } } = this
    const zzListeners = {
      onEmitZzController: (_MountedZZVtor: ZZV0<typeof zzFields>) => {
        // ! 折纸表单验证器 -构造完毕后 由子表单组件 -发射到本组件中 -并存储到本组件 的 RefImpl 响应式对象中
        this.ZVController = _MountedZZVtor
        console.log(this.ZVController)
      },
      onFieldChange: (...args: any) => {
        const [FieldOptions, FieldZV$] = args
        console.log('🚀 ~ render ~ FieldOptions, FieldZV$:', FieldOptions, FieldZV$)
      },
      onFinalValue: (FinalValue: any) => {
        console.log('表单通过了重重考验, 终于拿到了最终的所有 -表单域值 ', FinalValue)
      }
    }
    return <M9ZzForm formModel={formModel} formRules={formRules} {...zzListeners}></M9ZzForm>
  }
})

export default ZzFormUI