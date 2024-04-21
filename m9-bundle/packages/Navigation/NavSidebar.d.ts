import { PropType } from "vue";
import { MNavMenuItem } from './Navigation.type';
declare const _default: import("vue").DefineComponent<{
    menus: {
        type: PropType<MNavMenuItem[]>;
        required: true;
        default: () => never[];
    };
}, {
    state: {
        m9Menus: {
            no: number;
            key: string | number;
            label: string | number;
            level?: number | undefined;
            isAlive: boolean;
            isSelected: boolean;
            isCollapse: boolean;
            children?: any[] | undefined;
            childrenLength: number;
        }[];
    };
    onSelectMenuItem: (menuItem: MNavMenuItem) => void;
    onMenuItemExpandOrFold: (menuItem: MNavMenuItem) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    menus: {
        type: PropType<MNavMenuItem[]>;
        required: true;
        default: () => never[];
    };
}>>, {
    menus: MNavMenuItem[];
}, {}>;
export default _default;
