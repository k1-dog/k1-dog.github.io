import M9Message from './Message';
import { ComponentInstance } from "vue";
export interface M9MsgProps {
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
    life?: number;
}
export interface M9MsgState {
    isShow: boolean;
}
export type M9MessageInstanceT = ComponentInstance<typeof M9Message>;
export type M9MessageInsListT = Array<M9MessageInstanceT>;
