import { ShapeFlags } from "../shared/ShapeFlags";

export const Fragment = Symbol("Fragment");
export const Text = Symbol("Text");

export { createVNode as createElementVNode };

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    component: null,
    key: props && props.key,
    shapeFlags: getShapeFlag(type), // 用来判断组件是什么类型
    el: null, // 组件的元素
  };

  // 额外处理 vnode 的类型
  if (typeof children === "string") {
    vnode.shapeFlags = vnode.shapeFlags | ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlags = vnode.shapeFlags | ShapeFlags.ARRAY_CHILDREN;
  }

  if (vnode.shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === "object") {
      vnode.shapeFlags = vnode.shapeFlags | ShapeFlags.SLOT_CHILDREN;
    }
  }

  return vnode;
}

export function createTextVNode(text) {
  return createVNode(Text, {}, text);
}

function getShapeFlag(type) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
