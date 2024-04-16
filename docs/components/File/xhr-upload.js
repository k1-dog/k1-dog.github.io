const AjaxConfig = {
  method: 'post',
  headers: {},
  url: '',
  data: {}
}

const _$Response = {
  /**
   * @description 上传文件 -- 成功回调
   * @param {*} XHR
   * @returns { XMLHttpRequest.responseText }
   */
  success (XHR) {
    const text = XHR.responseText || XHR.response
    if (!text) {
      return text
    }

    try {
      return JSON.parse(text)
    } catch (e) {
      return text
    }
  },
  /**
   * @description 上传文件 -- 失败回调
   * @param {*} upUrl
   * @param {*} XHR
   * @returns { ErrMsg }
   */
  failed (upUrl, XHR) {
    let msg
    if (XHR.response) {
      msg = `${XHR.status} ${XHR.response.error || XHR.response}`
    } else if (XHR.responseText) {
      msg = `${XHR.status} ${XHR.responseText}`
    } else {
      msg = `美九上传到 ${upUrl} 失败~! ${XHR.status}`
    }
    const err = new Error(msg)

    return err
  }
}

/** @see 发生预期之外的错误导致上传事件失效,..也用一个空进度来过渡显示..增进用户体验 */
function noopProgress (onProgress, file) {
  const e = {}
  const _startProgress = () => {
    let _t1 = window.setInterval(() => {
      if (e.percentage && e.percentage >= 100) {
        window.clearInterval(_t1)
        _t1 = null || undefined
        return void 0
      }
      e.percentage = e.percentage === undefined ? 0 : e.percentage + 1
      onProgress(e, file)
    }, 50)
  }
  _startProgress() // 启动上传进度过渡特效
}

/**
 * @description 上传文件 -- 进度回调
 * @param {*} e
 * @param {*} onProgress
 */
function _$onProgress (e, onProgress, file) {
  if (e.total > 0) {
    e.percentage = (e.loaded / e.total) * 100
  }
  if (e.percentage == 100) {
    noopProgress(onProgress, file)
  }
  // onProgress && onProgress(e, file)
}

function _$onDestroy (XHR) {
  XHR.abort() // 立即通知 XHR 停止当前请求
  XHR = null || undefined // 立即通知 内存回收 - XHR 对象空间
}

/**
 * @description 原生 - XHR - 上传文件进度侦查
 * @param {*} options
 */
export default function upload (options) {
  const {
    upUrl, // 上传路径
    data, // 额外请求体参数
    file, // 文件本身
    fileName, // 文件名称
    onFailed, // 上传失败回调
    onSuccess, // 上传成功回调
    onProgress, // 进度监测回调函数
    withCredentials // 是否允许跨域
  } = options

  AjaxConfig.url = upUrl || window.location || 'http://' + URL.createObjectURL(file)

  const _XHR = new XMLHttpRequest()

  _XHR.upload && (_XHR.upload.onprogress = (e) => _$onProgress(e, onProgress, file))

  const _FD = new FormData()

  _FD.append('file', file)

  data &&
    Object.keys(data).forEach((k) => {
      _FD.append(k, data[k])
    })

  AjaxConfig.data = _FD

  // 注册 - XHR - 请求成功回调
  _XHR.onload = function onLoad () {
    if (_XHR.status < 200 || _XHR.status >= 300) {
      noopProgress(onProgress, file)
      const errMsg = _$Response.failed(upUrl, _XHR)
      return (onFailed && onFailed(errMsg)) || errMsg
    }
    const _response = _$Response.success(_XHR)
    onSuccess && onSuccess()
    _$onDestroy(_XHR)
  }
  // 注册 - XHR - 请求失败回调
  _XHR.onerror = function onError (e) {
    const errMsg = _$Response.failed(upUrl, _XHR)
    onFailed && onFailed(errMsg)
    _$onDestroy(_XHR)
  }
  _XHR.open(AjaxConfig.method, AjaxConfig.url, true) // 建立 - XHR - 请求连接
  // 跨域配置
  if (withCredentials && 'withCredentials' in _XHR) {
    _XHR.withCredentials = true
  }
  _XHR.send(AjaxConfig.data) // 发送 - XHR - 请求

  return [_$onDestroy, _XHR]
}
