const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // setupStatus
        const { setupStatus } = instance;
        if (key in setupStatus) {
            return setupStatus[key];
        }
        // if (key === "$el") {
        //   return instance.vnode.el;
        // }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupStatus: {},
    };
    return component;
}
function setupComponent(instance) {
    // todo 1. initProps() 初始化 props
    // initProps();
    // todo 2. initSlots() 初始化 slots
    // initSlots();
    // 3. 初始化有状态的组件
    setupStatusfulComponent(instance);
}
function setupStatusfulComponent(instance) {
    const Component = instance.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        // setup() 可以返回一个 function 或 object
        // 如果返回的是一个 function,那么我们这边就默认这个 function 是 render 函数
        // 如果是一个 object ,那么把这个 object 注入组件上下文
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
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

function render(vnode, container) {
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
    if (shapeFlags & 1 /* ShapeFlags.ELEMENT */) {
        processElement(vnode, container);
    }
    else if (shapeFlags & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
// 处理元素
function mountElement(vnode, container) {
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
    if (shapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
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
function processComponent(vnode, container) {
    // 挂载组件
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    // 1. 创建组件实例
    const instance = createComponentInstance(initialVNode);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy); // subTree 是虚拟节点树
    // vnode -> patch()
    // vnode element -> mountElement();
    patch(subTree, container);
    // 所有的 element 都已经处理完成
    initialVNode.el = subTree.el;
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlags: getShapeFlag(type),
        el: null,
    };
    if (typeof children === "string") {
        vnode.shapeFlags = vnode.shapeFlags | 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlags = vnode.shapeFlags | 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

/*
createApp 返回一个 app 对象
*/
function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 先转换成 vnode
            //    compoent -> vnode
            // 后续所有的操作，都是基于 vnode 做处理
            // document.querySelector(rootContainer);
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
