export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
  };

  return component;
}

export function setupComponent(instance) {
  // todo 1. initProps() 初始化 props
  // initProps();
  // todo 2. initSlots() 初始化 slots
  // initSlots();

  // 3. 初始化有状态的组件
  setupStatusfulComponent(instance);
}

function setupStatusfulComponent(instance: any) {
  const component = instance.type;

  const { setup } = component;

  if (setup) {
    // setup() 可以返回一个 function 或 object
    // 如果返回的是一个 function,那么我们这边就默认这个 function 是 render 函数
    // 如果是一个 object ,那么把这个 object 注入组件上下文
    const setupResult = setup();

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
  const component = instance.type;

  if (!component.render) {
    instance.render = component.render
  }
}