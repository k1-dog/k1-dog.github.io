export enum UPSTATUS {
  OK = 'ok',
  ING = 'ing',
  FAIL = 'fail'
}

export interface MU_PROGRESS extends ProgressEvent {
  percentage: number
}
export interface MU_FILE extends File {
  _MFID_: string
}

export interface FT extends MU_FILE {
  name: string
  width: number
  height: number
  active: boolean
  percentage: number
  imgUrl: string
  status: UPSTATUS
  rawFile: MU_FILE
  // 每个美九文件对象 - 对应的上传句柄 - 用来手动取消销毁句柄xhr实例, 优化性能, 形成闭合的工程周期
  $xhr: null | {
    _kill: (xhr: XMLHttpRequest) => void;
    xhr: XMLHttpRequest
  }
}

export interface MFileProps {}

export interface MFileState {
  imager: {
    [k in Extract<keyof FT, '_MFID_' | 'name' | 'width' | 'height' | 'imgUrl'>]: FT[k]
  } & { _MFID_: FT['_MFID_'] } | null 

  fileList: FT[]

  everyImgSize: number

  showImager: boolean
}

// * M9-Uploader Props - 文件上传器 - 通用契约
export interface ChangeEvent<T = Element> extends InputEvent {
  target: EventTarget & { value: string };
  currentTarget: EventTarget & { files: Array<FT> };
}

export interface UploaderProps {
  onChange(e: ChangeEvent<HTMLInputElement>): void

  onSuccess(): void

  onFailed(): void

  onProgress(): void
}


export interface UploadListProps {
  fileList: FT[]

  showPreviewer: (file: FT) => void

  onRemove: (file: FT) => void
}

// * M9-Imager Props 图片处理器 - 通用契约
export interface MImagerProps {
  src: string | undefined

  isShow: boolean

  width?: number

  height?: number

  showCallback: (val: boolean) => void

  playOtherImageCallback: (isPrevious: boolean) => void
}

export interface MImagerState {
  ratio: number

  width: number

  height: number

  angle: number
}
