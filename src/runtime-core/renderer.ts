import { createComponentInstance, setupComponent } from "./components";

export function render(vnode, container) {
  // render 函数其实就干了一件事情，就是调用 patch() 方法
  // patch() 方便后续进行递归的处理
  
  // 判断 是不是 element 类型
  patch(vnode, container);
}

function patch(vnode, container) {
  // 去处理组件
  processComponent(vnode, container);
}

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
  const subTree = instance.render(); // subTree 是虚拟节点树
  // vnode -> patch()
  // vnode element -> mountElement();

  patch(subTree, container);
}