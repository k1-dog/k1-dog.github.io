import classNames from "classnames";

export const preCls = "miku-select";

export const mselect_inner_baseCls = `${preCls}__inner`;

export const mselect_inner_extCls = 'MSS-multiable';

export const mselect_inner_preCls = (props) => classNames(

  mselect_inner_baseCls,

  { [mselect_inner_extCls]: props.multiable }
);

export const mselect_inner_arrowCls = `${mselect_inner_baseCls}--arrow`;

export const mselect_options_preCls = `${preCls}__options`;

export const mselect_filter_search__input = `${preCls}-F__search`;

export const mselect_options_row = `${mselect_options_preCls}--row`;

export const mselect_options_row_ctt = `${mselect_options_row}-content`;

export const mselect_options_row_yes = `${mselect_options_row}-yes_icon`;

export const is_opt_mselected_cls = (cur_opt) => classNames(

  mselect_options_row,

  { 'm-selected': !!cur_opt.selected }
);

export const mselect_multi_wrapper = `m-multi-select-wrapper`;

export const mselect_multi_wrapper_item = `${mselect_multi_wrapper}--item`;

export const mselect_multi_wrapper_item_ctt = `${mselect_multi_wrapper_item}_content`;

export const mselect_multi_wrapper_item_close = `${mselect_multi_wrapper_item}_close`;