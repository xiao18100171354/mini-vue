import { effect } from "../reactivity/effect";
import { isObject } from "../shared/index";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProps: hostPatchProps,
    insert: hostInsert,
  } = options;

  function render(vnode, container) {
    // render 函数其实就干了一件事情，就是调用 patch() 方法
    // patch() 方便后续进行递归的处理

    patch(null, vnode, container, null);
  }

  // n1 -> old vnode
  // n2 -> new vnode
  function patch(n1, n2, container, parentComponent) {
    // ShapeFlags
    // vnode -> flag
    const { type, shapeFlags } = n2;

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
        processFragment(n1, n2, container, parentComponent);
        break;

      case Text:
        // 纯文本类型 -> 只需要将文本添加到容器中即可
        processText(n1, n2, container);
        break;

      default:
        // 通过 ShapeFlags 改在判断代码
        if (shapeFlags & ShapeFlags.ELEMENT) {
          // type => div p span 等等 html 标签
          processElement(n1, n2, container, parentComponent);
        } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
          // type => 组件类型, App Foo 等
          processComponent(n1, n2, container, parentComponent);
        }
        break;
    }
  }

  function processText(n1, n2: any, container: any) {
    // children 其实就是 字符串
    const { children } = n2;
    const textNode = document.createTextNode(children);
    n2.el = textNode;
    container.append(textNode);
  }

  function processFragment(n1, n2: any, container: any, parentComponent) {
    // 只需要处理 children
    mountChildren(n2.children, container, parentComponent);
  }

  // 处理元素入口方法
  function processElement(n1, n2: any, container: any, parentComponent) {
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container);
    }
  }

  function patchElement(n1, n2, container) {
    console.log("patchElement");
    console.log("n1", n1);
    console.log("n2", n2);

    // props
    // children
  }

  function mountElement(vnode: any, container: any, parentComponent) {
    const { children, props, type, shapeFlags } = vnode;
    // const el = document.createElement(type);
    const el = hostCreateElement(type);
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
      // const isOn = (key: string) => /^on[A-Z]/.test(key);
      // if (isOn(key)) {
      //   const event = key.slice(2).toLowerCase();
      //   // 注册事件 onClick onMouseOver 等
      //   el.addEventListener(event, val);
      // } else {
      //   // 处理常规属性 id class 等
      //   el.setAttribute(key, val);
      // }

      hostPatchProps(el, key, val);
    }

    // container.append(el);
    hostInsert(el, container);
  }

  function mountChildren(vnode, container, parentComponent) {
    vnode.forEach((child) => {
      patch(null, child, container, parentComponent);
    });
  }

  // 处理组件入口方法
  function processComponent(n1, n2: any, container: any, parentComponent) {
    // 挂载组件
    mountComponent(n2, container, parentComponent);
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
    // 利用 effect 进行依赖收集
    // 组件的 render 函数，会使用响应式对象中的属性
    // 这时候把逻辑放到 effect 中，就可以当响应式对象属性触发 get 时进行依赖收集，set 时触发依赖
    effect(() => {
      //  通过在组件实例 instance 对象上声明一个变量 isMounted 来判断组件是否已经挂载过
      if (!instance.isMounted) {
        // 没有挂载过，初始化
        console.log("init");

        // 在 setupStatusfulComponent() 执行时，会对组件 setup 函数返回的对象进行 Proxy 代理，并且添加到组件实例 instance 的 proxy 属性
        const { proxy } = instance;
        // 准备就绪，调用实例instance的render函数，也就是组件的render函数，并且直接绑定render函数的this指向上述的代理对象（这样就可以通过 this 访问 setup 函数返回对象的属性和属性值）
        const subTree = instance.render.call(proxy); // subTree 是虚拟节点树
        // 保存当前虚拟节点，后续更新节点时有用
        instance.subTree = subTree;
        console.log("subTree", subTree);
        // vnode -> patch()
        // vnode element -> mountElement();

        // console.log("container", container);
        patch(null, subTree, container, instance);

        // 所有的 element 都已经处理完成

        initialVNode.el = subTree.el;

        // 初始化结束，把组件实例 isMounted 属性设置为 true
        instance.isMounted = true;
      } else {
        // 已经挂载过了，需要更新
        console.log("update");

        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        const preSubTree = instance.subTree;
        instance.subTree = subTree; // 把最新的虚拟节点树赋值给 subTree

        patch(preSubTree, subTree, container, instance);
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
