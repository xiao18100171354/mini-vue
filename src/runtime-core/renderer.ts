import { isObject } from "../shared/index";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { Fragment, Text } from "./vnode";

export function render(vnode, container) {
  // render 函数其实就干了一件事情，就是调用 patch() 方法
  // patch() 方便后续进行递归的处理

  patch(vnode, container);
}

function patch(vnode, container, parentComponent) {
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

  // 根据 type 来选择对应处理 vnode 的方法
  switch (type) {
    case Fragment:
      // Fragment 类型 -> 只需要渲染 children 即可
      processFragment(vnode, container, parentComponent);
      break;

    case Text:
      // 纯文本类型 -> 只需要将文本添加到容器中即可
      processText(vnode, container);
      break;

    default:
      // 通过 ShapeFlags 改在判断代码
      if (shapeFlags & ShapeFlags.ELEMENT) {
        // type => div p span 等等 html 标签
        processElement(vnode, container, parentComponent);
      } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
        // type => 组件类型, App Foo 等
        processComponent(vnode, container, parentComponent);
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

function processFragment(vnode: any, container: any, parentComponent) {
  // 只需要处理 children
  mountChildren(vnode.children, container, parentComponent);
}

// 处理元素入口方法
function processElement(vnode: any, container: any, parentComponent) {
  mountElement(vnode, container, parentComponent);
}

function mountElement(vnode: any, container: any, parentComponent) {
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
    mountChildren(children, el, parentComponent);
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

function mountChildren(vnode, container, parentComponent) {
  vnode.forEach((child) => {
    patch(child, container, parentComponent);
  });
}

// 处理组件入口方法
function processComponent(vnode: any, container: any, parentComponent) {
  // 挂载组件
  mountComponent(vnode, container, parentComponent);
}

function mountComponent(initialVNode: any, container, parentComponent) {
  // 1. 创建组件实例, 为组件实例声明 setupStatus，props，slots，emit 等属性
  const instance = createComponentInstance(initialVNode, parentComponent);
  // 2. 处理组件实例，初始化组件的 props slots setupStatus
  setupComponent(instance);
  // 3.
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance: any, initialVNode, container) {
  // 在 setupStatusfulComponent() 执行时，会对组件 setup 函数返回的对象进行 Proxy 代理，并且添加到组件实例instance的proxy属性
  const { proxy } = instance;
  // 准备就绪，调用实例instance的render函数，也就是组件的render函数，并且直接绑定render函数的this指向上述的代理对象（这样就可以通过 this 访问 setup 函数返回对象的属性和属性值）
  const subTree = instance.render.call(proxy); // subTree 是虚拟节点树
  console.log("subTree", subTree);
  // vnode -> patch()
  // vnode element -> mountElement();

  console.log("container", container);
  patch(subTree, container, instance);

  // 所有的 element 都已经处理完成

  initialVNode.el = subTree.el;
}
