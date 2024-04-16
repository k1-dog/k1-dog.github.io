import { H_Trim } from './helper.core'
import { PI, HALF_PI, _limit, H_floor } from './helper.math'
import { _defaultGap } from './helper.options'

import { M9Chart } from './m9.d'

/**
 * @type { RetinaBuildingForOurEyes } 重构视觉系统 - 计算缩放倍率 => 得出最终横纵坐标系
 * xScales = [30, 50, 80, 140, 250]
 * yScales = [5, 20, 60, 150, 280]
 * eg. 例子
 * 10 <= yScales <= 1500
 * canvas.h = 300
 * -> ratio = (1500 / 300) * 1.2 = 6
 * -> yAxisPoint = yScales / ratio
 * => 1.66 <= yAxisPoint <= 250
 */ 
export function RetinaBuildingForOurEyes ($M9Chart, $XScales0, $YScales0) {
  const { X_OFFSET, Y_OFFSET } = _defaultGap
  const cw = $M9Chart.width - X_OFFSET
  const ch = $M9Chart.height - Y_OFFSET
  // 间隙比例因子
  const _GapFactor = 1.2
  const ratioY = _limit($YScales0).max / ch
  const yPoints = $YScales0.map(y0 => y0 / ratioY).map(H_floor)

  const ratioX = _limit($XScales0).max / cw
  const xPoints = $XScales0.map(x0 => x0 / ratioX).map(H_floor)

  return {
    xAxisPoints: xPoints,
    yAxisPoints: yPoints,
    defaultGapX: H_floor(cw / $XScales0.length),
    defaultGapY: H_floor(ch / $YScales0.length)
  }
}

// 画布上下文 - 压栈 + 出栈
export function U$Push_Pop_Ctx2D ($ctx: CanvasRenderingContext2D, _call_: Function = () => {}, ...args) {
  $ctx.save()
  _call_ && _call_($ctx, ...args)
  $ctx.restore()
}

/**
 * @description 获取设备像素比
 * @function getDevicePixelRatio
 * 
 */
export function getDevicePixelRatio () {
  return window.devicePixelRatio
}

/**
 * @description 修整设备像素比 - 调节画布清晰度
 * @param chart
 * @param forceRatio
 * @param forceStyle
 * @returns True if the canvas context size or transformation has changed.
 */
 export function _DeviceRatioBuilding(
  chart: M9Chart,
  forceRatio: number = getDevicePixelRatio()
): boolean | void {
  const pixelRatio = forceRatio || 1;
  const deviceHeight = H_floor(chart.height * pixelRatio); // ! 根据逻辑高度像素 -> 生成物理真实设备高度像素
  const deviceWidth = H_floor(chart.width * pixelRatio); // ! 根据逻辑宽度像素 -> 生成物理真实设备宽度像素

  chart.height = H_floor(chart.height);
  chart.width = H_floor(chart.width);

  const canvas = chart.canvas;

  // If no style has been set on the canvas, the render size is used as display size,
  // making the chart visually bigger, so let's enforce it to the "correct" values.
  // See https://github.com/chartjs/Chart.js/issues/3575
  if (canvas.style && (!canvas.style.height && !canvas.style.width)) {}
  // * 画布css宽高 ->赋值<- 逻辑像素
  // canvas.style.height = `${chart.height}px`;
  // canvas.style.width = `${chart.width}px`;
  // * 画布物理真实宽高 赋值 物理真实设备像素
  // canvas.height = deviceHeight;
  // canvas.width = deviceWidth;

  if (canvas.height !== deviceHeight || canvas.width !== deviceWidth) {
    canvas.style.height = `${chart.height}px`;
    canvas.style.width = `${chart.width}px`;
    // * 画布css宽高 ->赋值<- 逻辑像素
    // * 画布物理真实宽高 赋值 物理真实设备像素
    canvas.height = deviceHeight;
    canvas.width = deviceWidth;
    if (chart.$TYPE === 'Bar') {
      chart.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, _defaultGap.X_OFFSET, -_defaultGap.Y_OFFSET);
    } else if (chart.$TYPE === 'Pie') {
      const _pointAtPieCenter = { x0: H_floor(chart.width / 2), y0: H_floor(chart.height / 2) }
      chart.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      chart.ctx.translate(_pointAtPieCenter.x0, _pointAtPieCenter.y0);
    }
    
    return true;
  }
  return false;
}

/**
 * @description 颜色增进
 * @function H_ColorLightenDarken()
 * @param $color @param $percentage
 * @return @param $newColor
 * 
 * .eg #ef10be * 110% = ?
 */
export function H_ColorLightenDarken ($color, $percentage = 10) {
  const cleanColor = H_Trim($color, '#')
  const colorHex = cleanColor
  const r = parseInt(colorHex.substr(0, 2), 16)
  const g = parseInt(colorHex.substr(2, 2), 16)
  const b = parseInt(colorHex.substr(4, 2), 16)

    return '#' +
       ((0|(1<<8) + r + (256 - r) * $percentage / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * $percentage / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * $percentage / 100).toString(16)).substr(1)
}

/**
 * @description 颜色增进 - (ImageData RGBa·版本)
 * @function H_ImageDataRGBa()
 * @param $imageData @param $percentage @param { + | - } $optCode
 * @return { ImageData } $imageData
 * 
 * .eg rgba(1, 2, 3, 0.5) * 110% = ?
 */
export function H_ImageDataRGBa ($imageData, $percentage = 10, $optCode = '+') {
  const _factor = $optCode === '+' ? 1 + $percentage / 100 : 1 - $percentage / 100
  const _limitFn = $optCode === '+' ? Math.min : Math.max
  const _diffNum = $optCode === '+' ? 255 : 0
  for (let _i = 0; _i < $imageData.data.length; _i += 4) {
    $imageData.data[_i] = _limitFn(_diffNum, $imageData.data[_i] * _factor) // R
    $imageData.data[_i + 1] = _limitFn(_diffNum, $imageData.data[_i + 1] * _factor) // G
    $imageData.data[_i + 2] = _limitFn(_diffNum, $imageData.data[_i + 2] * _factor) // B
  }
  return $imageData
}

export function addRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  rect: any
) {
  const {x, y, w, h, radius} = rect;

  // top left arc
  ctx.arc(x + radius.topLeft, y + radius.topLeft, radius.topLeft, 1.5 * PI, PI, true);

  // line from top left to bottom left
  ctx.lineTo(x, y + h - radius.bottomLeft);

  // bottom left arc
  ctx.arc(x + radius.bottomLeft, y + h - radius.bottomLeft, radius.bottomLeft, PI, HALF_PI, true);

  // line from bottom left to bottom right
  ctx.lineTo(x + w - radius.bottomRight, y + h);

  // bottom right arc
  ctx.arc(x + w - radius.bottomRight, y + h - radius.bottomRight, radius.bottomRight, HALF_PI, 0, true);

  // line from bottom right to top right
  ctx.lineTo(x + w, y + radius.topRight);

  // top right arc
  ctx.arc(x + w - radius.topRight, y + radius.topRight, radius.topRight, 0, -HALF_PI, true);

  // line from top right to top left
  ctx.lineTo(x + radius.topLeft, y);
}

export function H_ClearArcArea ($ctx, $clearArgs) {
  const { x, y, radius, startAngle, endAngle, rotationAngle, anticlockwise = false } = $clearArgs
  $ctx.beginPath();
  $ctx.globalCompositeOperation = 'destination-out';
  $ctx.fillStyle = 'purple';
  $ctx.rotate(rotationAngle)
  // 绘制新图形
  $ctx.lineTo(radius, 0)
  $ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
  $ctx.lineTo(0, 0)
  // 参数分别是：圆心横坐标、纵坐标、半径、开始的角度、结束的角度、是否逆时针
  $ctx.fill();
  $ctx.closePath();
}
