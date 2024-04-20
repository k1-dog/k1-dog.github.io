import M9Animation from './m9.animator'
import { _isBetween } from './helper.math'
import { H_M9UUID } from './helper.core'
import { _defaultGap } from './helper.options'
import { M9Chart, M9Animation as AnimationT, InteractionT, AnimationOptionsT, M9PathT, Point } from './m9.d'

const _M9UUID = H_M9UUID()

/**
 * @type { InteractorCtor } 位置探测器
 * 记录 M9-Charts 画布中, 核心图形的有效范围信息 (横纵坐标 长度大小 边框大小 上下左右距离 该范围内图形像素数据 ImageData 索引顺序)
 */

class M9Interactor {
    // 范围信息对象数组
    _interactions: Array<InteractionT> = []
    _M9Chart: null | M9Chart = null

    // 映射对象 - 核心图形位置 ~ 动画处理器
    _MapIA: WeakMap<InteractionT, AnimationT> = new WeakMap()

    // 各

    constructor ($M9Chart) {
      this._M9Chart = $M9Chart
    }

    // 根据图形 path 形状路径 -> 构建出对应位置探测对象
    _buildingWithCtxPath_ ($m9Path: M9PathT) {
      const { l, t, w, h } = $m9Path
      const $Interaction: InteractionT = {
        ...$m9Path,
        // imageData: this._M9Chart.ctx.getImageData(l, t, w, h), // 该图形像素数据对象 - TMD 饼图区域怎么使用该函数啊 - 直接报错
        IID: this._buildingIID_() // 唯一 IID
      }
      return $Interaction
    }

    // 位置探测 - 跟踪记录·对应图形 path 形状
    _sniffing_ ($m9Path: M9PathT) {
      const _interaction = this._buildingWithCtxPath_($m9Path)
      this._interactions.push(_interaction)
    }

    /**
   * @description 位置的合法性检测 [某位置对象参数 是否位于规定 M9Chart 画布大小之内]
   * @function _isM9Edge_
   * @param { InteractionT } $Interaction
   * @return { boolean } is
   */
    _isM9Edge_ ($Interaction: InteractionT) {
      return true
    }

    // 绑定核心元素 - 对应动画渲染器
    _Animations_ () {
      this._interactions.forEach(interaction => {
        this._MapIA.set(interaction, new M9Animation(interaction, this._M9Chart))
      })
    }

    // 启动某一图形位置对应 动画渲染器
    _StartAnimation_ ($interaction: InteractionT, $AnimationOptions: AnimationOptionsT) {
      const animator = this._MapIA.get($interaction)
      animator && animator._run_($AnimationOptions)
    }

    // 找寻鼠标事件发生源点 是否在有效位置内 - 如果有效返回该位置对象<即返回对应的核心图形元素>
    _isInLocation ($P: Point, _call_) {
      const { x, y } = $P
      // 事件源点 - 画布 M9-Cavs 上边距离 Y
      const _eTc = y // e.offsetTop
      // 事件源点 - 画布 M9-Cavs 左边距离 X
      const _eLc = x // e.offsetLeft

      // ! 这里, 我怀疑 有像素设备比的关系, 真实画布上的单位1距离, 与鼠标移动事件形成的 x-y 坐标像素距离存在一定比例的误差, 之后细研究
      const Y0 = _eTc
      const X0 = _eLc

      const isInteraction = this._interactions.find(
        (interaction) => {
          const { w, h, t: y1, b: y2, l: x1, r: x2 } = interaction
          // 这个 1.25 是设备像素比 - 有空好好研究一下 这个比例和实际鼠标事件x-y像素, 与画布上x-y坐标有何关系
          return _isBetween(X0, x1, x1 + w) && _isBetween(Y0, y1, y1 + h)
        }
      )
      
      if (isInteraction) {
        // 同步处理 - 对应动画重渲染
        const _TargetAnimation = this._MapIA.get(isInteraction)
        _call_ && _call_(isInteraction, _TargetAnimation)
        // _TargetAnimation && _TargetAnimation._ready_('Bar')
        return [isInteraction, _TargetAnimation]
      }

      return false
    }

    // 绑定 - 图形位置对象 IID
    _buildingIID_ (): string {
      const IID = _M9UUID('I')
      return IID
    }

    // 更新 - 某一图形位置信息对象
    _updateI_A_ ($oldInteraction: InteractionT, $newInteraction: InteractionT) {
      if (this._MapIA.has($oldInteraction)) {
        const I_Animation = this._MapIA.get($oldInteraction)
        this._MapIA.delete($oldInteraction)
        // 新位置对象 - 替换旧位置对象
        const { n: No } = $oldInteraction
        this._interactions[No] = $newInteraction
        // 给新位置对象 - 添加 IID号
        $newInteraction.IID = this._buildingIID_()
        I_Animation && this._MapIA.set($newInteraction, I_Animation)
      }
    }

    // 通知 - 动画处理器 同步更新跟踪的位置信息对象
    _notifyA_I_ ($newInteraction: InteractionT) {
      const I_Animation = this._MapIA.get($newInteraction)
      I_Animation && I_Animation._updateA_I($newInteraction)
    }
}

export default M9Interactor