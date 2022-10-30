import { proxyRefs } from "../reactivity";
import { shallowReadonly } from "../reactivity/reactive";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstace";
import { initSlots } from "./componentSlots";

export function createComponentInstance(vnode, parent) {
  console.log("createComponentInstance", parent);
  const component = {
    vnode,
    type: vnode.type,
    next: null, // 表示下次要更新的 vnode
    setupStatus: {}, //
    props: {}, // 组件 props
    slots: {}, // 插槽
    provides: parent ? parent.provides : {}, // 存放 provide
    parent,
    isMounted: false,
    subTree: {},
    emit: () => {},
  };

  component.emit = emit.bind(null, component) as any;

  return component;
}

export function setupComponent(instance) {
  // todo 1. 处理 Props initProps() 初始化 Props
  initProps(instance, instance.vnode.props);
  // todo 2. 处理插槽 initSlots() 初始化插槽 slots
  initSlots(instance, instance.vnode.children);

  // 3. 初始化有状态的组件
  setupStatusfulComponent(instance);
}

function setupStatusfulComponent(instance: any) {
  const Component = instance.type;

  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);

  const { setup } = Component;

  if (setup) {
    setCurrentInstance(instance);

    // setup() 可以返回一个 function 或 object
    // 如果返回的是一个 function,那么我们这边就默认这个 function 是 render 函数
    // 如果是一个 object ,那么把这个 object 注入组件上下文
    // 实现 setup 第一个参数接收只读的 props 和第二个参数接收含有 emit 属性的对象
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
    // getCurrentInstance() 只能在 setup() 方法中使用，所以在组件 setup() 方法调用完成后需要重置
    setCurrentInstance(null);

    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult: any) {
  // 基于上述 setup() 可以返回 function 或 object 进行一个判断
  // TODO function

  if (typeof setupResult === "object") {
    // 把 setup() 返回的值赋值到组件实例上，在 render 可以通过 this 访问 setup 方法返回的对象
    instance.setupStatus = proxyRefs(setupResult);
  }

  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  const Component = instance.type;

  // if (Component.render) {
  // 把组件的 render 函数赋值给组件实例的 render 属性
  instance.render = Component.render;
  // }
}

let currentInstance = null;

export function getCurrentInstance() {
  return currentInstance;
}

function setCurrentInstance(instance) {
  currentInstance = instance;
}
