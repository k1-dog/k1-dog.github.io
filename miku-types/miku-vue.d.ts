declare module '*.vue' {
  import type { DefineComponent } from "vue"
  const component:DefineComponent<{},{},any>

  export interface GlobalComponents {
    M9Button: typeof import("../docs/components/Button/Button.tsx")
    M9Checkbox: typeof import("../docs/components/Checkbox/CheckBox.tsx")
    M9CheckboxItem: typeof import("../docs/components/Checkbox/CheckboxItem.tsx")
    M9DatePicker: typeof import("../docs/components/DatePicker/DatePicker.tsx")
    M9File: typeof import("../docs/components/File/File.tsx")
    M9Form: typeof import("../docs/components/Form/Form.tsx")
    M9Grid: typeof import("../docs/components/Grid/Grid.tsx")
    M9Input: typeof import("../docs/components/Input/Input.tsx")
    M9Chart: typeof import("../docs/components/M9-Charts/m9._z0_.ts")
    M9Dragger: typeof import("../docs/components/M9-Utils/draggable/element-dragger.tsx")
    M9DragHelper: typeof import("../docs/components/M9-Utils/draggable/element-drag-helper.tsx")
    M9Message: typeof import("../docs/components/Message/controller.tsx")
    M9Modal: typeof import("../docs/components/Modal/Modal.tsx")
    M9Nav: typeof import("../docs/components/Navigation/Navigation.tsx")
    M9Popover: typeof import("../docs/components/Popover/Popover.tsx")
    M9Select: typeof import("../docs/components/Select/Select.tsx")
    M9Spin: typeof import("../docs/components/Spin/Spin.tsx")
    M9Switch: typeof import("../docs/components/Switch/Switch.tsx")
    M9VScroller: typeof import("../docs/components/VScroller/VScroller.tsx")
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
