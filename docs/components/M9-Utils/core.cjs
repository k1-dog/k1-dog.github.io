
/**
 * @see 控制函数在一段时间末必须执行一次
 * @param {* number} delay$T 
 * @param {* Function} __call__ 
 * @param {? number } isDebounce @see 防抖\节流--功能标记
 * @returns {* Function} 
 */
export function MThrottle (__call__, delay$T, Config = {}) {
  const { isDebounce = false, onBeforeRun, onAfterRun } = Config

  var _timeoutID_;

  var last$T = Date.now(); // = 0

  var now$T;

  var diff$T;

  var _init$G_ = true;

  function reset_$con () {

    // last$T = 0;

    // _timeoutID_ = null;
  }

  function Miku_3eturn_$v () {

    var _self = this;

    now$T = Date.now();

    diff$T = now$T - last$T;

    onBeforeRun && onBeforeRun();

    for (var _len = arguments.length, Miku_$Args = new Array(_len), _i = 0; _i < _len; _i++) {
      Miku_$Args[_i] = arguments[_i];
    }

    var exec_$con = (function () {

      var flag$T = false;

      var is_at0nce = !_timeoutID_ && _init$G_;

      var over_7ime_$con = diff$T >= delay$T;

      if (is_at0nce) {
        /** @see 当首次执行时--||--计时器到期时-√允许执行 */
        flag$T = true;

        _init$G_ = false;

      } else if (isDebounce === true) { /** @see 防抖型 */

        flag$T = true;

        diff$T = 0; /** @see -0- */

        clr_$timer(); /** @see 抛旧迎新 */

      } else if (isDebounce === false) { /** @see 节流型 */

        if (over_7ime_$con) {

          flag$T = true; /** @see 两次事件触发的间隔已超过阈值-√允许执行 */

          diff$T = delay$T;
        }
      }

      return flag$T;
    })();

    function Miku_$execute () {

      __call__.apply(_self, Miku_$Args);

      last$T = Date.now(); // now$T;
    }

    function clr_$timer () {
      if (_timeoutID_) {
        clearTimeout(_timeoutID_);
        _timeoutID_ = null;
      }
    }

    function _called_2_clr$timer () {
      Miku_$execute();

      clr_$timer();
    }

    function set_$timer (__Fn__) {
      _timeoutID_ = setTimeout(() => {
        __Fn__()
        onAfterRun && onAfterRun()
      }, delay$T - diff$T)
    }

    if (exec_$con) {
      set_$timer(_called_2_clr$timer);
    } else {
      set_$timer(clr_$timer);
    }

    /**
     * @see 不论节流还是防抖|>|>不论当前执行条件有没有触发,最终都会清除之前的定时器~~!
     */
    // set_$timer();
  }

  return Miku_3eturn_$v;
};


/**
 * @function [debounce] -/ | constrain the specify [_ fn _] to get execute
 * in certain time
 * @param {* a callback func transfered into here *} __call__ 
 * @param {* execute time - /s *} _duration_
 * @returns {* null *}
 */
export function MDebounce (__call__, _duration_) { }

/**
 * @description [解析本地图片路径在项目中生成静态资源 - <简易 url-loader 实现>]
 * @function MURL_Resolve
 * @param {* the file_path waiting parse *} $filePath
 * @returns {* string *} __mResolvedPath
 */
export function MURL_Resolve ($filePath) { }

const _toString = Object.prototype.toString
export function _TypeOf (value) {
  return _toString.call(value).slice(8, -1).toLowerCase()
}

/**
 * @function M9CloneDeep
 * @description 深拷贝
 */
export function M9CloneDeep ($data) {
  const dataType = _TypeOf($data)
  if (dataType !== 'array' && dataType !== 'object') {
    return $data
  }

  const _cloneData = dataType === 'array' ? [] : {}
  if (dataType === 'array') {
    for (let _i = 0; _i < $data.length; _i++) {
      const oldItem = $data[_i]
      const newItem = M9CloneDeep(oldItem)
      _cloneData.push(newItem)
    }
  } else {
    const _objKeys = Object.keys($data)
    for (let _j = 0; _j < _objKeys.length; _j++) {
      const _k = _objKeys[_j]
      const oldValue = $data[_k]
      const newValue = M9CloneDeep(oldValue)
      _cloneData[_k] = newValue
    }
  }

  return _cloneData
}

// * 一维列表 - 转 - 树形结构
export function A2T ($array, convertOption = { id: 'id', pid: 'pid', children: 'children' }) {
  // ! 判空
  if (!Array.isArray($array)) {
    return []
  }
  const { id, pid, children } = convertOption
  const _ArrayData = _cloneDeep($array)
  // ! 提取 - 待转换的数组 -> 存储成 Map 映射对象
  const idObjMap = _ArrayData.reduce(($Map, obj) => {
    $Map[obj[id]] = obj
    return $Map
  }, {})
  // ! 代存储 的 树结构
  const tree = []
  _ArrayData.forEach((obj) => {
    const parent = idObjMap[obj[pid]]
    if (parent) {
      parent[children] = parent[children] || []
      parent[children].push(obj)
    } else {
      tree.push(obj)
    }
  })
  const pureTree = tree.filter(rootNode => !rootNode[pid])
  return pureTree
}

// * 树形结构 - 平铺成一维数组
export function T2A ($tree, convertOption = { id: 'id', pid: 'pid', children: 'children' }, call, level = 0) {
  if (!Array.isArray($tree) || $tree.length === 0) {
    return []
  }
  const { id, pid, children } = convertOption
  let _flattenArray = $tree.reduce(($array, node, index) => {
    // 回调处理 当前节点
    node.level = level
    call && call(node)
    $array.push(node)
    if (Array.isArray(node[children]) && node[children].length > 0) {
      // ? 孩子节点不为空, 则继续递归
      const childrenList = T2A(node[children], convertOption, call, level + 1)
      $array = $array.concat(childrenList)
      node.childrenLength = childrenList.length
      delete node[children]
    } else {
      node.childrenLength = 0
    }
    return $array
  }, [])

  return _flattenArray
}
