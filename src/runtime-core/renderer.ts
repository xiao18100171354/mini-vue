import { isObject } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { Fragment, Text } from "./vnode";

export function render(vnode, container) {
  // render 函数其实就干了一件事情，就是调用 patch() 方法
  // patch() 方便后续进行递归的处理

  patch(vnode, container);
}

function patch(vnode, container) {
  // ShapeFlags
  // vnode -> flag
  const { type, shapeFlags } = vnode;

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

  // Fragment 类型 -> 只渲染 children
  switch (type) {
    case Fragment:
      processFragment(vnode, container);
      break;

    case Text:
      processText(vnode, container);
      break;

    default:
      // 通过 ShapeFlags 改在判断代码
      if (shapeFlags & ShapeFlags.ELEMENT) {
        processElement(vnode, container);
      } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container);
      }
      break;
  }
}

function processText(vnode: any, container: any) {
  // children 其实就是 字符串
  const { children } = vnode;
  const textNode = document.createTextNode(children);
  vnode.el = textNode;
  container.append(textNode);
}

function processFragment(vnode: any, container: any) {
  // 只需要处理 children
  mountChildren(vnode.children, container);
}

// 处理元素入口方法
function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

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
  for (const key in props) {
    const val = props[key];
    // 先显示具体的 click，再去通用化
    // on + Event namae
    // onMousedown
    const isOn = (key: string) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase();
      // 注册事件 onClick onMouseOver 等
      el.addEventListener(event, val);
    } else {
      // 处理常规属性 id class 等
      el.setAttribute(key, val);
    }
  }

  container.append(el);
}

function mountChildren(vnode, container) {
  vnode.forEach((child) => {
    patch(child, container);
  });
}

// 处理组件入口方法
function processComponent(vnode: any, container: any) {
  // 挂载组件
  mountComponent(vnode, container);
}

function mountComponent(initialVNode: any, container) {
  // 1. 创建组件实例
  const instance = createComponentInstance(initialVNode);
  // 2. 处理组件实例
  setupComponent(instance);
  // 3.
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance: any, initialVNode, container) {
  const { proxy } = instance;
  const subTree = instance.render.call(proxy); // subTree 是虚拟节点树
  // vnode -> patch()
  // vnode element -> mountElement();

  debugger;
  patch(subTree, container);

  // 所有的 element 都已经处理完成

  initialVNode.el = subTree.el;
}
