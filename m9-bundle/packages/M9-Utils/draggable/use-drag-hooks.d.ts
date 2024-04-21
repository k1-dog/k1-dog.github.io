import { Ref } from "vue";
export default function useM9Dragger($props: any, $ctx: any): {
    childRef: Ref<any>;
    leftDragRef: Ref<any>;
    leftDraggerStyle: import("vue").ComputedRef<{
        top: string;
        left: string;
    }>;
    rightDragRef: Ref<any>;
    rightDraggerStyle: import("vue").ComputedRef<{
        top: string;
        left: string;
    }>;
    topDragRef: Ref<any>;
    topDraggerStyle: import("vue").ComputedRef<{
        top: string;
        left: string;
    }>;
    bottomDragRef: Ref<any>;
    bottomDraggerStyle: import("vue").ComputedRef<{
        top: string;
        left: string;
    }>;
    onNotifyUpdateState: () => void;
};
