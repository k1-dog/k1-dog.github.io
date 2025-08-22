interface IUnique {
  <U>(arr: Array<U>): U[]
}

export const unique: IUnique = function <U>($arr: U[]): U[] {
  let _Arr: U[]
  _Arr = Array.from(new Set($arr))
  return _Arr
}

interface IIsNumber {
  (x: any): boolean
}

export const isM9Number: IIsNumber = ($N) => {
  let _reset: number = 0,
    _flag: boolean = false
  if (typeof $N === 'string') {
    _reset = Number($N)
  } else if (typeof $N === 'number') {
    _reset = $N
  }
  if (!isNaN(_reset)) {
    _flag = true
  }
  return _flag
}

interface MikuFileReader {
  (_OF_: Blob): FileReader
}

export const createFileReader: MikuFileReader = ($_OFile_: Blob) => {
  const reader = new FileReader()

  reader.readAsDataURL($_OFile_)

  return reader
}

export const toDrawIMG = (
  $IMG: HTMLImageElement,
  /*{sx = 0, sy = 0, sw = 0, sh = 0} = {},
  {ox = 0, oy = 0} = {},*/
  $_W_: number,
  $_H_: number
) => {
  const canvas = document.createElement('canvas')

  let _ctx: CanvasRenderingContext2D

  function _getPen() {
    let _ctx = canvas.getContext('2d')!,
      _CH = $_H_,
      _CW = $_W_

    let _devicePixelRatio = window.devicePixelRatio || 1,
      _backingStoreRatio = 1,
      _ratio = _devicePixelRatio / _backingStoreRatio

    canvas.width = _CW * _ratio * 25

    canvas.height = _CH * _ratio * 25

    canvas.style.width = _CW + 'px'

    canvas.style.height = _CH + 'px'

    _ctx.scale(_ratio * 25, _ratio * 25)

    return _ctx
  }

  _ctx = _getPen()

  // ctx.drawImage(IMG, sx, sy, sw, sh, ox, oy, _W_, _H_);

  _ctx.drawImage($IMG, 0, 0, $_W_, $_H_)

  const NEW_BASE64_URL = canvas.toDataURL('image/jpeg', 0.8)

  return NEW_BASE64_URL
}

type TImgBaseStat = { IMG: HTMLImageElement; NW: number; NH: number }

export const ResizeIMG = ($OResult: string | ArrayBuffer | null, $expectSize: number = 100) => {
  const IMG = new Image()

  IMG.src = $OResult as string

  const compress_: Promise<TImgBaseStat> = new Promise(($resolve) => {
    IMG.onload = () => {
      const OW = IMG.width,
        OH = IMG.height

      const ratio = OW / OH,
        ML = $expectSize

      let _NH: number = OH,
        _NW: number = OW

      if (OW > ML || OH > ML) {
        if (OW > OH) {
          _NW = ML
          _NH = ML / ratio
        } else {
          _NW = ML * ratio
          _NH = ML
        }
      }

      const IMGStat = { IMG, NW: _NW, NH: _NH }

      $resolve(IMGStat)
    }
  })

  return compress_
}

type TConvertIMGBase64Return = {
  uri: string
  width: number
  height: number
}

interface MikuBase64 {
  (_f_: Blob, _es_?: number): Promise<TConvertIMGBase64Return>
}

export const getBase64OfMiku_: MikuBase64 = ($file, $ExpectedSize = 100) => {
  return new Promise(($resolve, $reject) => {
    const reader = createFileReader($file)

    reader.onload = ($FR_EV) => {
      ResizeIMG($FR_EV.target!.result, $ExpectedSize).then(($IMG) => {
        const { IMG: img, NW, NH } = $IMG

        $resolve({
          uri: toDrawIMG(img, /*undefined, undefined,*/ NW, NH),
          width: NW,
          height: NH
        })
      })
    }

    reader.onerror = ($error) => $reject($error)
  })
}
