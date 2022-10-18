import { shallowReadonly } from "../reactivity/reactive";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstace";

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupStatus: {},
    props: {},
  };

  return component;
}

export function setupComponent(instance) {
  // todo 1. initProps() 初始化 props
  initProps(instance, instance.vnode.props);
  // todo 2. initSlots() 初始化 slots
  // initSlots();

  // 3. 初始化有状态的组件
  setupStatusfulComponent(instance);
}

function setupStatusfulComponent(instance: any) {
  const Component = instance.type;

  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);

  const { setup } = Component;

  if (setup) {
    // setup() 可以返回一个 function 或 object
    // 如果返回的是一个 function,那么我们这边就默认这个 function 是 render 函数
    // 如果是一个 object ,那么把这个 object 注入组件上下文
    const setupResult = setup(shallowReadonly(instance.props));

    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult: any) {
  // 基于上述 setup() 可以返回 function 或 object 进行一个判断
  // TODO function

  if (typeof setupResult === "object") {
    // 把 setup() 返回的值赋值到组件实例上
    instance.setupStatus = setupResult;
  }

  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  const Component = instance.type;

  // if (Component.render) {
  instance.render = Component.render;
  // }
}
