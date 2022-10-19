const extend = Object.assign;
const isObject = (value) => {
    return value !== null && typeof value === "object";
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        console.log(_, c);
        return c ? c.toUpperCase() : "";
    });
};
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

const targetMap = new Map();
// 触发依赖
function trigger(target, key) {
    // 1. 获取依赖的 map 容器对象 depsMap
    let depsMap = targetMap.get(target);
    // 2. 获取 key 对应的所有依赖 dep
    let dep = depsMap.get(key);
    // 3. 遍历执行依赖的 run 或 scheduler 函数，从而更新视图
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
// ! 封装 getter 函数
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // ! isReactive() 功能实现 和 isReadonly() 功能实现
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        // ! shallowReadonly 功能实现
        if (shallow) {
            return res;
        }
        // ! reactive 和 readonly 嵌套对象实现
        // 判断 res 是不是一个 object
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
// ! 封装 setter 函数
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        // ! 触发依赖
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key:${key} set 失败 因为targer是readonly`, target);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
    // return new Proxy(raw, {
    //   get(target, key) {
    //     // {foo: 1}
    //     const res = Reflect.get(target, key);
    //     // 依赖收集
    //     track(target, key);
    //     return res;
    //   },
    //   set(target, key, value) {
    //     const res = Reflect.set(target, key, value);
    //     // todo 触发依赖
    //     trigger(target, key);
    //     return res;
    //   },
    // });
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
    // return new Proxy(raw, {
    //   get: createGetter(true),
    //   set(target, key, value) {
    //     return true;
    //   },
    // });
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function createActiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`target ${target} 必须是一个对象！`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

function emit(instance, event, ...args) {
    console.log("emit", event);
    // instance.props -> event
    const { props } = instance;
    // if (hasOwn()) {}
    // TPP
    // 先去写一个特定的行为，再去重构成通用的行为
    // add -> Add
    // add-foo -> addFoo
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
    // attrs
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    // $slots
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // setupStatus
        const { setupStatus, props } = instance;
        // if (key in setupStatus) {
        //   return setupStatus[key];
        // }
        if (hasOwn(setupStatus, key)) {
            return setupStatus[key];
        }
        // if (key in props) {
        //   return props[key];
        // }
        if (hasOwn(props, key)) {
            return props[key];
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

function initSlots(instance, children) {
    // chidlren -> single | array
    // instance.slots = Array.isArray(children) ? children : [children];
    // normalizeObjectSlot(children, instance.slots);
    const { vnode } = instance;
    if (vnode.shapeFlags & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlot(children, instance.slots);
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}
function normalizeObjectSlot(children, slots) {
    // children -> object
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupStatus: {},
        props: {},
        slots: {},
        emit: () => { },
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // todo 1. initProps() 初始化 props
    initProps(instance, instance.vnode.props);
    // todo 2. initSlots() 初始化 slots
    initSlots(instance, instance.vnode.children);
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
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
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
    for (const key in props) {
        const val = props[key];
        // 先显示具体的 click，再去通用化
        // on + Event namae
        // onMousedown
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            // 注册事件
            el.addEventListener(event, val);
        }
        else {
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
// 处理组件
function processComponent(vnode, container) {
    // 挂载组件
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    // 1. 创建组件实例
    const instance = createComponentInstance(initialVNode);
    // 2. 
    setupComponent(instance);
    // 3. 
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
    if (vnode.shapeFlags & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlags = vnode.shapeFlags | 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
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

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        // slot -> function 可以实现作用域插槽
        if (typeof slot === "function") {
            return createVNode("div", {}, slot(props));
        }
        // return createVNode("div", {}, slot);
    }
}

export { createApp, h, renderSlots };
