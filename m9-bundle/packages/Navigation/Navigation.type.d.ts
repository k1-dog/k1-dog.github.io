import { VNode } from "vue";
export interface MNavHeaderSlots {
    defaultHeader: () => Array<VNode>;
    searcher: () => Array<VNode>;
    logo: () => Array<VNode>;
    avatar: () => Array<VNode>;
}
export interface MNavHeaderEmits {
    onSearch: string;
    onChangeLang: string;
}
export interface MNavMenuItem {
    no: number;
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
    clickMenuItem: string;
}
export interface MNavSidebarProps {
    title?: string;
    isCollapse: boolean;
    menus: Array<MNavMenuItem>;
}
export interface MNavBodySlots {
    defaultBody: (slotScope: {
        isCollapse: boolean;
    }) => Array<VNode>;
}
export interface MNavFootSlots {
    defaultFooter: (slotScope: {
        isCollapse: boolean;
    }) => Array<VNode>;
}
export interface MNavSlots extends MNavHeaderSlots, MNavBodySlots, MNavFootSlots {
    default: (slotScope: any) => Array<VNode>;
}
export interface MNavProps extends MNavSidebarProps {
    version?: 'm9.0.1';
}
export interface MNavEmits extends MNavSidebarEmits, MNavHeaderEmits {
    version?: 'm9.0.1';
}
export declare const mnav_cls = "miku-nav";
export declare const mnav_header_cls: string;
export declare const mnav_body_cls: string;
export declare const mnav_footer_cls: string;
export declare const mnav_sidebar_cls: string;
export declare const mnav_sidebar_title_cls: string;
export declare const mnav_sidebar_menus_cls: string;
export declare const mnav_sidebar_menus_item_cls: string;
export declare const mnav_sidebar_menus_item_icon_cls: string;
export declare const mnav_sidebar_menus_item_text_cls: string;
export declare const menu_item_indent_size = 15;
