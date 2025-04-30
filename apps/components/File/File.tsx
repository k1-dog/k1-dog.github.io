import { preCls, uploaderCls } from './index'
import Imager from './Imager.js'
import M9Icon from '@k1/styles/assets/_.js'
import xhrUploadJS from './xhr-upload.js'
import { H_getBase64 } from '@k1/utils'
import { M9WebAdaptor } from '../Grid/Grid.js'

import { MU_PROGRESS, FT, MFileState, UploaderProps, UploadListProps, MU_FILE, UPSTATUS } from './Type.js'
import { TransitionGroup, defineComponent, reactive } from 'vue'
import classnames from 'classnames'


const UploadHeader = () => {
  return (
    <div className={`${preCls}--header`} m9-web-dom="::document => md -> flex-shrink: 0; width: unset; ">
      <M9Icon className={`${preCls}--header__icon`} icon="upload"></M9Icon>
      <span className={`${preCls}--header__title`}>文件上传</span>
    </div>
  )
}
const Uploader = (props: Partial<UploaderProps>) => {
  const { onChange, onSuccess, onFailed, onProgress } = props

  const uploader_label_cls = `${preCls}__uploader--label`
  const uploader_input_cls = `${preCls}__uploader--input`
  const uploader_id_cls = `${preCls}__uploader-id`

  return (
    <>
      <label className={uploader_label_cls} htmlFor={uploader_id_cls} m9-web-dom="::document => md -> height: 10rem; flex-shrink: 0; width:3rem"/>
      <input type='file' hidden id={uploader_id_cls} name={uploader_input_cls} onChange={onChange} multiple={false} />
    </>
  )
}
const UploadList = (props: UploadListProps) => {
    const { fileList, showPreviewer, onRemove } = props

    const getStatusCls = (FStatus: UPSTATUS) => {
      const fileStatusCls = classnames('file-status', {
        'file-success': FStatus === UPSTATUS.OK,
        'file-uploading': FStatus === UPSTATUS.ING,
        'file-failed': FStatus === UPSTATUS.FAIL
      })
      return fileStatusCls
    }

    return (
      <div className={`${preCls}--filelist`} m9-web-dom="::document => md -> display: flex;flex-wrap: wrap;max-height: 10rem">
      <TransitionGroup name={`${preCls}--animation`}>
        {
          fileList.map((file) => (
            <div
              key={file._MFID_}
              className={`${preCls}--filelist__item`}
              m9-web-dom="::document => md -> width: 45%;margin: 6px;"
            >
              <img
                style={{
                  float: 'left',
                  cursor: 'pointer',
                  width: `${file['width'] || 0}px`,
                  height: `${file['height'] || 0}px`,
                  borderRadius: `20px`
                }}
                src={file['imgUrl']}
                alt={file.name}
                onClick={() => showPreviewer(file)}
              />
              <div className='float-with-img'>
                <div className='desc-wrap'>
                  <span className='file-name'>{file.name}</span>
                  <span className='file-percentage'>{file.percentage + '%'}</span>
                  <span className={getStatusCls(file.status)}></span>
                  <span
                    className='file-close'
                    onClick={() => { onRemove(file) }}></span>
                </div>
                <div className='progress-bar' style={{ width: `${file.percentage}%` }}></div>
              </div>
            </div>
          ))
        }
      </TransitionGroup>
      </div>
    )
}

export default defineComponent({
  name: 'M9Filer',
  setup () {
    const state = reactive<MFileState>({ fileList: [], everyImgSize: 47, imager: null, showImager: false })
    // 弹出 - 图片预览器
    function onPreview (file: FT) {
      const imager = {
        _MFID_: file._MFID_,
        name: file['name'],
        imgUrl: file['imgUrl'],
        width: file['width'],
        height: file['height']
      }
      
      state.imager = imager
      state.showImager = true
    }

    // 关闭 - 图片预览器
    function onClosePreview () {
      state.imager = null
      state.showImager = false
    }

    const U$GetFID = (function () {
      let _fileNo = -1
      return function () {
        return 'MM_Fid' + _fileNo++
      }
    })()

    function U$PushFile(f: FT): FT[] {
      const filelist = state.fileList || []
      filelist.push(f)
      return filelist
    }

    function U$Start (FStat: {
      imgUrl: string
      percentage: number
      width: number
      height: number
      rawFile: MU_FILE
    }): void {
      const f: FT = {
        _MFID_: FStat['rawFile']._MFID_,
        name: FStat['rawFile'].name,
        ...FStat,
        active: true,
        status: UPSTATUS.OK,
        $xhr: null
      } as FT
  
      const fileList = U$PushFile(f)
      state.fileList = fileList
      const XHRUP_Config = {
        file: f['rawFile'],
        fileName: f['name'],
        onProgress: U$OnProgress,
        withCredentials: true
      }
      const [xhrKill, xhr] = xhrUploadJS(XHRUP_Config)
      f.$xhr = { _kill: xhrKill, xhr }
    }

    function updateUI () {
      state.fileList = [...state.fileList]
    }

    function U$GetFile(F: MU_FILE): FT | null {
      const fileList = state.fileList
      if (!fileList || !fileList.length) {
        return null
      }
  
      return fileList.find((f) => f._MFID_ === F._MFID_) as any
    }
  
    function U$OnProgress(pe: MU_PROGRESS, file: MU_FILE): void {
      
      const _File = U$GetFile(file)
  
      if (!_File) {
        return void 0
      }
  
      _File.status = UPSTATUS.ING
      _File.percentage = pe.percentage || 0
  
      updateUI()
    }

    // 文件上传后 - 变化回调事件
    function onFileChange (evt: MReturnParam<UploaderProps['onChange']>) {
      const fileList = evt.currentTarget.files
  
      if (!fileList || !fileList.length) return
  
      let base64URI: string, NW: number, NH: number
  
      const file = fileList[0]
  
      const { everyImgSize } = state
  
      H_getBase64(file, everyImgSize).then((newImgStat) => {
        base64URI = newImgStat.uri
  
        NW = newImgStat.width
  
        NH = newImgStat.height
  
        let imgStat = Object.assign({}) // creating copy of object
  
        imgStat.width = NW
  
        imgStat.height = NH
  
        file._MFID_ = U$GetFID()
  
        U$Start({
          imgUrl: base64URI,
          percentage: 0,
          ...imgStat,
          rawFile: file
        })
      })
    }

    function isRemoveOk(file: FT): boolean {
      const { fileList } = state
      const _FileIndex = fileList.findIndex((File) => File._MFID_ === file._MFID_)
  
      if (_FileIndex === -1) {
        return false
      }
  
      const _file = fileList[_FileIndex]
      _file['active'] = false
      fileList.splice(_FileIndex, 1)

      return true
    }

    // 文件列表 - 删除事件
    function onRemove (file: FT): void {
      const isRe = isRemoveOk(file)
  
      if (!isRe) { return void 0 }

      // ! 这里有个优化点 - 如果文件从列表中成功移除的话, 那么同步触发该文件上传的xhr销毁句柄, 节省内存空间
      const $f_xhr = file.$xhr
      $f_xhr && $f_xhr._kill($f_xhr.xhr)
  
      updateUI()
    }

    // 图片预览器 - 切换其他图片去预览 (下一张 | 上一张)
    function U$TakeAnotherImageToPlay (isPrevious = false) {
      const { fileList, imager } = state
      const _FileIndex = fileList.findIndex((File) => File._MFID_ === imager!._MFID_)
  
      if (
        (isPrevious === false && _FileIndex >= fileList.length - 1)
        ||
        (isPrevious === true && _FileIndex <= 0)
      ) {
        return void 0
      }
  
      if (isPrevious === true) {
        const prevImager = fileList[_FileIndex - 1]
        state.imager = prevImager
      } else if (isPrevious === false) {
        const nextImager = fileList[_FileIndex + 1]
        state.imager = nextImager
      }
  
      return
    }

    return { state, onPreview, onClosePreview, onFileChange, onRemove, U$TakeAnotherImageToPlay }
  },

  render () {
    const { onPreview, onClosePreview, onFileChange, onRemove, U$TakeAnotherImageToPlay } = this
    const { fileList = [], showImager, imager } = this.state

    const fileX = (
      <div className={`${uploaderCls}`} m9-web-dom="::document => md -> display: flex;">
        <UploadHeader></UploadHeader>
        <Uploader onChange={onFileChange}></Uploader>
        <UploadList fileList={fileList} showPreviewer={onPreview} onRemove={onRemove} />
      </div>
    )

    return (
      <M9WebAdaptor>
      <div className={preCls} m9-web-dom="::document => md -> width: unset">
        {[
          fileX,
          <Imager
            isShow={showImager}
            width={imager && imager['width']}
            height={imager && imager['height']}
            preCls={preCls}
            src={imager && imager['imgUrl']}
            onShowCallback={onClosePreview}
            onPlayOtherImageCallback={U$TakeAnotherImageToPlay}
          />
        ]}
      </div>
      </M9WebAdaptor>
    )
  }
})
