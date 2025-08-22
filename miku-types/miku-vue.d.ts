// 泛型工具类型生成完整路径
type RefTypePathToComponent<D extends string, F extends string = D> = `../apps/components/${D}/${F}.tsx`

declare module '*.vue' {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<{},{},any>
  export interface GlobalComponents {
    M9File: typeof import('../apps/components/File/File.tsx').default // RefTypePathToComponent<'File'>
    M9Form: typeof import('../apps/components/Form/Form.tsx').default // RefTypePathToComponent<'Form'>
    M9Grid: typeof import('../apps/components/Grid/Grid.tsx').MGCol // RefTypePathToComponent<'Grid'>
    M9Spin: typeof import('../apps/components/Spin/Spin.tsx').default // RefTypePathToComponent<'Spin'>
    M9Modal: typeof import('../apps/components/Modal/Modal.tsx').default // RefTypePathToComponent<'Modal'>
    M9Input: typeof import('../apps/components/Input/Input.tsx').default // RefTypePathToComponent<'Input'>
    M9Button: typeof import('../apps/components/Button/Button.tsx').default // RefTypePathToComponent<'Button'>
    M9Select: typeof import('../apps/components/Select/Select.tsx').default// RefTypePathToComponent<'Select'>
    M9Switch: typeof import('../apps/components/Switch/Switch.tsx').default // RefTypePathToComponent<'Switch'>
    M9Nav: typeof import('../apps/components/Navigation/Navigation.tsx').default // RefTypePathToComponent<'Navigation'>
    M9Popover: typeof import('../apps/components/Popover/Popover.tsx').default // RefTypePathToComponent<'Popover'>
    M9Checkbox: typeof import('../apps/components/Checkbox/Checkbox.tsx').default // RefTypePathToComponent<'Checkbox'>
    M9CheckboxItem: typeof import('../apps/components/Checkbox/CheckboxItem.tsx').default // RefTypePathToComponent<'Checkbox', 'CheckboxItem'>
    M9DatePicker: typeof import('../apps/components/DatePicker/DatePicker.tsx').default // RefTypePathToComponent<'DatePicker'>
    M9Message: typeof import('../apps/components/Message/controller.tsx').default // RefTypePathToComponent<'Message', 'controller'>
    M9VScroller: typeof import('../apps/components/VScroller/VScroller.tsx').default // RefTypePathToComponent<'VScroller'>

    M9Chart: typeof import("../apps/v0/m9._z0_.ts").default
    M9Dragger: typeof import("../apps/utils/draggable/element-dragger.tsx").default
    M9DragHelper: typeof import("../apps/utils/draggable/element-drag-helper.tsx").default
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
