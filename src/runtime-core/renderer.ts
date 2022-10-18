import { isObject } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // render 函数其实就干了一件事情，就是调用 patch() 方法
  // patch() 方便后续进行递归的处理

  patch(vnode, container);
}

function patch(vnode, container) {
  // ShapeFlags
  // vnode -> flag
  const { shapeFlags } = vnode;

  // 判断 vnode 是不是 element 类型
  // 是 element 那么就应该处理 element
  // if (typeof vnode.type === "string") {
  //   // ELEMENT
  //   processElement(vnode, container);
  // } else if (isObject(vnode.type)) {
  //   // } else if (isObject(vnode.type)) {
  //   // STATEFUL_COMPONENT
  //   // 去处理组件
  //   processComponent(vnode, container);
  // }


  // 通过 ShapeFlags 改在判断代码
  if (shapeFlags & ShapeFlags.ELEMENT) {
    processElement(vnode, container);
  } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container);
  }
}

function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

// 处理元素
function mountElement(vnode: any, container: any) {
  const { children, props, type, shapeFlags } = vnode;
  const el = document.createElement(type);
  vnode.el = el;

  // children 可能是 string 或 array
  // text_children
  // if (typeof children === "string") {
  //   el.textContent = children;
  // } else if (Array.isArray(children)) {
  //   // array_children
  //   // children 中的每一项也都是通过 h() 返回的 vnode，则递归调用
  //   mountChildren(children, el);
  // }

  // 通过 ShapeFlags 改在判断代码
  if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el);
  }

  // 处理属性
  for (const k in props) {
    el.setAttribute(k, props[k]);
  }

  container.append(el);
}

function mountChildren(vnode, container) {
  vnode.forEach((child) => {
    patch(child, container);
  });
}

// 处理组件
function processComponent(vnode: any, container: any) {
  // 挂载组件
  mountComponent(vnode, container);
}

function mountComponent(initialVNode: any, container) {
  // 1. 创建组件实例
  const instance = createComponentInstance(initialVNode);
  setupComponent(instance);
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance: any, initialVNode, container) {
  const { proxy } = instance;
  const subTree = instance.render.call(proxy); // subTree 是虚拟节点树
  // vnode -> patch()
  // vnode element -> mountElement();

  patch(subTree, container);

  // 所有的 element 都已经处理完成

  initialVNode.el = subTree.el;
}
