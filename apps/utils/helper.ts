interface Unique {
  <U>(arr: Array<U>): U[]
}

export const unique: Unique = function <U>(arr: U[]): U[] {
  let Arr: U[]
  Arr = Array.from(new Set(arr))
  return Arr
}

interface isNumber {
  (x: any): boolean
}

export const isM9Number: isNumber = (N) => {
  let reset: number = 0,
    flag: boolean = false
  if (typeof N === 'string') {
    reset = Number(N)
  } else if (typeof N === 'number') {
    reset = N
  }
  if (!isNaN(reset)) {
    flag = true
  }
  return flag
}

interface MikuFileReader {
  (_OF_: Blob): FileReader
}

export const createFileReader: MikuFileReader = (_OF_: Blob) => {
  const reader = new FileReader()

  reader.readAsDataURL(_OF_)

  return reader
}

export const toDrawIMG = (
  IMG: HTMLImageElement,
  /*{sx = 0, sy = 0, sw = 0, sh = 0} = {},
  {ox = 0, oy = 0} = {},*/
  _W_: number,
  _H_: number
) => {
  const canvas = document.createElement('canvas')

  let ctx: CanvasRenderingContext2D

  function _getPen() {
    let ctx = canvas.getContext('2d')!,
      CH = _H_,
      CW = _W_

    let devicePixelRatio = window.devicePixelRatio || 1,
      backingStoreRatio = 1,
      ratio = devicePixelRatio / backingStoreRatio

    canvas.width = CW * ratio * 25

    canvas.height = CH * ratio * 25

    canvas.style.width = CW + 'px'

    canvas.style.height = CH + 'px'

    ctx.scale(ratio * 25, ratio * 25)

    return ctx
  }

  ctx = _getPen()

  // ctx.drawImage(IMG, sx, sy, sw, sh, ox, oy, _W_, _H_);

  ctx.drawImage(IMG, 0, 0, _W_, _H_)

  const NEW_BASE64_URL = canvas.toDataURL('image/jpeg', 0.8)

  return NEW_BASE64_URL
}

export const ResizeIMG = (OResult: string | ArrayBuffer | null, expectSize: number = 100) => {
  const IMG = new Image()

  IMG.src = OResult as string

  const _compress_ = new Promise((resolve) => {
    IMG.onload = () => {
      const OW = IMG.width,
        OH = IMG.height

      const ratio = OW / OH,
        ML = expectSize

      let NH: number = OH,
        NW: number = OW

      if (OW > ML || OH > ML) {
        if (OW > OH) {
          NW = ML
          NH = ML / ratio
        } else {
          NW = ML * ratio
          NH = ML
        }
      }

      const IMGStat: object = { IMG, NW, NH }

      resolve(IMGStat)
    }
  })

  return _compress_
}

type resizeIMGProps = {
  IMG: HTMLImageElement
  NW: number
  NH: number
}

type convertIMGBase64Return = {
  uri: string
  width: number
  height: number
}

interface MikuBase64 {
  (_f_: Blob, _es_?: number): Promise<convertIMGBase64Return>
}

export const _getBase64OfMiku_: MikuBase64 = (file, ExpectedSize = 100) => {
  return new Promise((resolve, reject) => {
    const reader = createFileReader(file)

    reader.onload = (FR_EV) => {
      ResizeIMG(FR_EV.target!.result, ExpectedSize).then((IMG) => {
        const { IMG: img, NW, NH } = IMG as resizeIMGProps

        resolve({
          uri: toDrawIMG(img, /*undefined, undefined,*/ NW, NH),
          width: NW,
          height: NH
        })
      })
    } // ts 非空断言 !

    reader.onerror = (error) => reject(error)
  })
}
