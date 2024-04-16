/** @description 扇形容器 - 元素模板 */
const T_SECTOR = function (TPL_ID, _props$2) {
  const { deg } = _props$2
  const helper_circleDiv = deg <= 180
    ? '<div class="half-circle bot-circle clip-circle"></div>'
    : '<div class="half-circle bot - circle concat - circle"></div>'

  const TPL = `
    <template id="miku-sector-${TPL_ID}">
      <div>
        <div class="half-circle top-circle base-circle"></div>
        ${helper_circleDiv}
        <div id="child-slot">
          <slot></slot>
        </div>
      </div>
    </template>
  `

  return TPL
}

/** @description 南瓜头 - 元素模板 */
const T_PUMPKIN = function (TPL_ID = '', _props$2) {
  const { isLighting } = _props$2

  const faceWidth = 2
  const faceRatio = 1.5
  const faceHeight = faceWidth / faceRatio
  const faceShadowSize = faceWidth * faceRatio

  const surfaceHeight = faceHeight
  const surffWWRatio = 2.3
  const surfaceWidth = faceWidth / surffWWRatio

  const eyeBottomBorderSize = faceWidth / 5
  const eyeSideBorderSize = eyeBottomBorderSize * 1.14
  const eyeTopBorderSize = eyeBottomBorderSize / 2.625
  const eyeTopSize = faceHeight / 4
  const twoEyeDistanceSize = faceWidth / 4

  const mouthWidth = faceWidth / 3.75
  const mouthRatio = 1 / 2
  const mouthHeight = mouthWidth * mouthRatio
  const mouthSideDistance = twoEyeDistanceSize
  const mouthBottomSize = faceHeight / 6

  const teethHeight = eyeBottomBorderSize / 2.1
  const teethWidth = teethHeight / 2

  const stemHeight = faceHeight / 2.85
  const stemRatio = 2.24
  const stemWidth = stemHeight / stemRatio
  const stemShadowWide = faceShadowSize

  const pumpkinOrderMap = { face: 1, stem: 2, eyes: 3, mouth: 4 }

  const TPL = `
    <style>
      .pumpkin{
        height: ${faceHeight}em;
        width: ${faceWidth}em;
        background: #f68632;
        border: 0.3em solid #a14907;
        border-radius: 70%/110%;
        position: relative;
        box-shadow: inset 0 0px ${faceShadowSize}px #a14907, 0 0 ${faceShadowSize * 1.5}px 1px red;
        z-index: ${pumpkinOrderMap.face};
      }
      
      .pumpkin .surface{
        height: ${surfaceHeight}em;
        width: ${surfaceWidth}em;
        margin: auto;
        border-radius: 70%/110%;
        border-bottom: 0.1em solid #a14907;
        border-top: 0.2em solid #a14907;
      }
      
      .pumpkin .surface:after{
        content: "";
        display: block;
        height: ${surfaceHeight}em;
        width: ${faceWidth * (7 / 9)}em;
        margin: auto;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 70%/110%;
        border-bottom: 0.2em solid #a14907;
        border-top: 0.3em solid #a14907;
      }
      
      .pumpkin .stem{
        background: #517f54;
        height: ${stemHeight}em;
        width: ${stemWidth}em;
        position: absolute;
        left: calc(50% - ${stemWidth / 2}em);
        top: -${stemHeight}em;
        -webkit-transform: rotate(5deg);
        transform: rotate(5deg);
        border-radius: 30% 20% 70% 10%;
        z-index: -1;
        box-shadow: inset 0 0px ${stemShadowWide}px #58cb62;
      }
      
      .pumpkin .eye{
        position: absolute;
        width: 0;
        height: 0;
        border-top: ${eyeTopBorderSize}em solid transparent;
        border-bottom: ${eyeBottomBorderSize}em solid transparent;
        top: ${eyeTopSize}em;
        box-shadow: ${isLighting === 'true' ? 'inset 0 0 5px red' : 'none'};
      }
      
      .pumpkin .eye.right{
        -webkit-transform: rotate(30deg);
        transform: rotate(30deg);
        right: ${twoEyeDistanceSize}em;
        border-left: ${eyeSideBorderSize}em solid ${isLighting === 'true' ? '#f6ff91' : '#401d03'};
      }
      
      .pumpkin .eye.left{
        -webkit-transform: rotate(-30deg);
        transform: rotate(-30deg);
        left: ${twoEyeDistanceSize}em;
        border-right: ${eyeSideBorderSize}em solid ${isLighting === 'true' ? '#f6ff91' : '#401d03'};
      }
      
      .pumpkin .mouth{
        width: ${mouthWidth}em;
        height: ${mouthHeight}em;
        position: absolute;
        bottom: ${mouthBottomSize}em;
        border-bottom: ${mouthWidth / 4}em solid ${isLighting === 'true' ? '#ffa1a1' : '#401d03'};
      }
      
      .pumpkin .mouth.right{
        right: ${mouthSideDistance}em;
        border-radius: 0 0 100% 0;
      }
      
      .pumpkin .mouth.left{
        left: ${mouthSideDistance}em;
        border-radius: 0 0 0 100%;
      }
      
      .pumpkin .teeth{
        width: ${teethWidth}em;
        height: ${teethHeight}em;
        position: absolute;
        bottom: calc(${mouthBottomSize}em);
        left: calc(50% + 2px);
        border-top: ${eyeTopBorderSize}em solid transparent;
        border-bottom: 0em solid transparent;
        border-left: ${eyeTopBorderSize}em solid #401d03;
      }
      
      .pumpkin .teeth:before, .pumpkin .teeth:after{
        content: "";
        display: block;
        position: absolute;
        width: 0;
        height: 0;
        border-top: ${eyeTopBorderSize}em solid transparent;
        border-bottom: ${teethWidth}em solid transparent;
        border-left: ${teethHeight}em solid #401d03;
      }
      
      .pumpkin .teeth:before{
        left: -${mouthWidth / 1.3}em;
        top: -${mouthHeight / 2.3}em;
        -webkit-transform: rotate(30deg);
        transform: rotate(30deg);
      }
      
      .pumpkin .teeth:after{
        right: ${mouthWidth / 5}em;
        top: 0;
        -webkit-transform: rotate(30deg);
        transform: rotate(30deg);
      }
    </style>
    <div id="${TPL_ID}" class="pumpkin">
      <div class="surface"></div>
      <div class="stem"></div>
      <div class="eye left"></div>
      <div class="eye right"></div>
      <div class="mouth left"></div>
      <div class="mouth right"></div>
      <div class="teeth"></div>
    </div>
  `
  return TPL
}

export const TPL_SECTOR = T_SECTOR
export const TPL_PUMPKIN = T_PUMPKIN
