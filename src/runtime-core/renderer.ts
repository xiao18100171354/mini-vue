import { isObject } from "../shared";
import { createComponentInstance, setupComponent } from "./components";

export function render(vnode, container) {
  // render 函数其实就干了一件事情，就是调用 patch() 方法
  // patch() 方便后续进行递归的处理

  patch(vnode, container);
}

function patch(vnode, container) {
  console.log(vnode.type);
  // 判断 vnode 是不是 element 类型
  // 是 element 那么就应该处理 element
  if (typeof vnode.type === "string") {
    processElement(vnode, container);
  } else if (isObject(vnode.type)) {
    // 去处理组件
    processComponent(vnode, container);
  }
}

function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

// 处理元素
function mountElement(vnode: any, container: any) {
  const { children, props, type } = vnode;
  const el = document.createElement(type);

  // children 可能是 string 或 array
  if (typeof children === "string") {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    // children 中的每一项也都是通过 h() 返回的 vnode
    mountChildren(children, el);
  }

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

function mountComponent(vnode: any, container) {
  // 1. 创建组件实例
  const instance = createComponentInstance(vnode);
  setupComponent(instance);
  setupRenderEffect(instance, container);
}

function setupRenderEffect(instance: any, container) {
  const { proxy } = instance;
  const subTree = instance.render.call(proxy); // subTree 是虚拟节点树
  // vnode -> patch()
  // vnode element -> mountElement();

  patch(subTree, container);
}
