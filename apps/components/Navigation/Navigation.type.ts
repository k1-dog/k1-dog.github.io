// |---------------------------------------------------------|
// |logo   text  |    searcher           language & Avatar   | --> header
// | ------------|-------------------------------------------|
// | MenuTitle   |                                           |
// | --menu1     |                                           |
// | --menu2     |                                           |
// | --menu3     |                                           |
// |   --submenu1|              --content--                  |
// | --menu4     |                                           |
// |   --submenu2|                                           |
// |-----   -----|                                           |
// |  <<Back收起 |               --footer--                  |
// |-------------|-------------------------------------------|

import { VNode } from "vue";

// * - m9导航头部组件契约数据
export interface MNavHeaderSlots {
  defaultHeader: () => Array<VNode>;
  // ? - 中间搜索引擎元素插槽 (拥有默认匿名插槽)
  searcher: () => Array<VNode>;
  // ? - 左上角logo元素具名插槽 (拥有默认匿名插槽)
  logo: () => Array<VNode>;
  // ? - 右上角Avatar用户头像元素具名插槽 (拥有默认匿名插槽)
  avatar: () => Array<VNode>;
}
type LangTS = 'zh' | 'en' | 'jp' | 'russia'
export interface MNavHeaderEmits {
  // ? - 搜索引擎的搜索值 回调事件
  onSearch: string // [searchV?: string | number];
  // ? - 系统语言集合切换 回调事件
  onChangeLang: string // [currentLang: LangTS];
  // ? - 系统退出事件 回调事件
}

// * - m9导航侧边栏契约数据
export interface MNavMenuItem {
  no: number; // 当前菜单项 在整个菜单中的索引位置 - 用来寻找他后边属于他自己的子菜单项
  key: string | number;
  label: string | number;
  level?: number;
  isAlive: boolean;
  isSelected: boolean;
  isCollapse: boolean;
  children?: Array<MNavMenuItem>;
  childrenLength: number;
}
export interface MNavSidebarEmits {
  // ? - 点击侧导航 菜单项 进行的事件回调
  clickMenuItem: string // [m9MenuItem: MNavMenuItem];
}
export interface MNavSidebarProps {
  // ? - 侧导航标题
  title?: string;
  // ? - 侧导航折叠标识
  isCollapse: boolean;
  // ? - 侧导航菜单数据源
  menus: Array<MNavMenuItem>;
}

// * - m9导航主体内容区契约数据
export interface MNavBodySlots {
  defaultBody: (slotScope: { isCollapse: boolean }) => Array<VNode>;
}

// * - m9导航尾部契约数据
export interface MNavFootSlots {
  defaultFooter: (slotScope: { isCollapse: boolean }) => Array<VNode>;
}

export interface MNavSlots extends MNavHeaderSlots, MNavBodySlots, MNavFootSlots {
  default: (slotScope: any) => Array<VNode>;
}

export interface MNavProps extends MNavSidebarProps { version?: 'm9.0.1'; }

export interface MNavEmits extends MNavSidebarEmits, MNavHeaderEmits { version?: 'm9.0.1'; }

export const mnav_cls = 'miku-nav'
export const mnav_header_cls = `${mnav_cls}__header`
export const mnav_body_cls = `${mnav_cls}__body`
export const mnav_footer_cls = `${mnav_cls}__footer`
export const mnav_sidebar_cls = `${mnav_cls}__sidebar`
export const mnav_sidebar_title_cls = `${mnav_sidebar_cls}-title`
export const mnav_sidebar_menus_cls = `${mnav_sidebar_cls}-menus`
export const mnav_sidebar_menus_item_cls = `${mnav_sidebar_menus_cls}__item`
export const mnav_sidebar_menus_item_icon_cls = `${mnav_sidebar_menus_item_cls}-icon`
export const mnav_sidebar_menus_item_text_cls = `${mnav_sidebar_menus_item_cls}-text`
export const menu_item_indent_size = 15