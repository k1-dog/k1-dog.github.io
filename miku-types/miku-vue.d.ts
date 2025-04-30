declare module '*.vue' {
  import type { DefineComponent } from "vue"
  const component:DefineComponent<{},{},any>

  export interface GlobalComponents {
    M9Button: typeof import("../apps/eyes/components/Button/Button.jsx")
    M9Checkbox: typeof import("../apps/eyes/components/Checkbox/CheckBox.jsx")
    M9CheckboxItem: typeof import("../apps/eyes/components/Checkbox/CheckboxItem.jsx")
    M9DatePicker: typeof import("../apps/eyes/components/DatePicker/DatePicker.jsx")
    M9File: typeof import("../apps/eyes/components/File/File.jsx")
    M9Form: typeof import("../apps/eyes/components/Form/Form.jsx")
    M9Grid: typeof import("../apps/eyes/components/Grid/Grid.jsx")
    M9Input: typeof import("../apps/eyes/components/Input/Input.jsx")
    M9Chart: typeof import("../apps/eyes/components/M9-Charts/m9._z0_.js")
    M9Dragger: typeof import("../apps/eyes/components/M9-Utils/draggable/element-dragger.jsx")
    M9DragHelper: typeof import("../apps/eyes/components/M9-Utils/draggable/element-drag-helper.jsx")
    M9Message: typeof import("../apps/eyes/components/Message/controller.jsx")
    M9Modal: typeof import("../apps/eyes/components/Modal/Modal.jsx")
    M9Nav: typeof import("../apps/eyes/components/Navigation/Navigation.jsx")
    M9Popover: typeof import("../apps/eyes/components/Popover/Popover.jsx")
    M9Select: typeof import("../apps/eyes/components/Select/Select.jsx")
    M9Spin: typeof import("../apps/eyes/components/Spin/Spin.jsx")
    M9Switch: typeof import("../apps/eyes/components/Switch/Switch.jsx")
    M9VScroller: typeof import("../apps/eyes/components/VScroller/VScroller.jsx")
  }
}

declare type MVElementR = ComponentPublicInstance | Element | null

declare type MReturnParam<F0> = F0 extends (args: infer P0) => any ? P0 : unknown

// declare module '@vue/runtime-core' {
//   interface ComponentCustomProperties {
//     $M9DragHelper: any;
//   }
// }
// declare module '@vitejs/plugin-vue-jsx'
