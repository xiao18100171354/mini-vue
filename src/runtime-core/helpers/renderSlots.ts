import { createVNode, Fragment } from "../vnode";

export function renderSlots(slots, name, props) {

  const slot = slots[name];

  if (slot) {
    // slot -> function 可以实现作用域插槽
    if (typeof slot === "function") {
      return createVNode(Fragment, {}, slot(props));
    }
    // return createVNode("div", {}, slot);
  }
}