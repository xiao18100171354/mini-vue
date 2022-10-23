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
        // 判断 Reflect.get(target, key) 返回的 res 是不是一个 object
        // 如果是一个对象，则要进行递归处理，让对象里面的属性也变成响应式。
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
        instance.slots = normalizeObjectSlot(children);
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}
function normalizeObjectSlot(children) {
    // children -> object
    const slots = {};
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
    return slots;
}

function createComponentInstance(vnode, parent) {
    console.log("createComponentInstance", parent);
    const component = {
        vnode,
        type: vnode.type,
        setupStatus: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        emit: () => { },
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // todo 1. 处理 Props initProps() 初始化 Props
    initProps(instance, instance.vnode.props);
    // todo 2. 处理插槽 initSlots() 初始化插槽 slots
    initSlots(instance, instance.vnode.children);
    // 3. 初始化有状态的组件
    setupStatusfulComponent(instance);
}
function setupStatusfulComponent(instance) {
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
function handleSetupResult(instance, setupResult) {
    // 基于上述 setup() 可以返回 function 或 object 进行一个判断
    // TODO function
    if (typeof setupResult === "object") {
        // 把 setup() 返回的值赋值到组件实例上，在 render 可以通过 this 访问 setup 方法返回的对象
        instance.setupStatus = setupResult;
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
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlags: getShapeFlag(type),
        el: null, // 组件的元素
    };
    // 额外处理 vnode 的类型
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
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function render(vnode, container) {
    // render 函数其实就干了一件事情，就是调用 patch() 方法
    // patch() 方便后续进行递归的处理
    patch(vnode, container, null);
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
            if (shapeFlags & 1 /* ShapeFlags.ELEMENT */) {
                // type => div p span 等等 html 标签
                processElement(vnode, container, parentComponent);
            }
            else if (shapeFlags & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                // type => 组件类型, App Foo 等
                processComponent(vnode, container, parentComponent);
            }
            break;
    }
}
function processText(vnode, container) {
    // children 其实就是 字符串
    const { children } = vnode;
    const textNode = document.createTextNode(children);
    vnode.el = textNode;
    container.append(textNode);
}
function processFragment(vnode, container, parentComponent) {
    // 只需要处理 children
    mountChildren(vnode.children, container, parentComponent);
}
// 处理元素入口方法
function processElement(vnode, container, parentComponent) {
    mountElement(vnode, container, parentComponent);
}
function mountElement(vnode, container, parentComponent) {
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
        mountChildren(children, el, parentComponent);
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
            // 注册事件 onClick onMouseOver 等
            el.addEventListener(event, val);
        }
        else {
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
function processComponent(vnode, container, parentComponent) {
    // 挂载组件
    mountComponent(vnode, container, parentComponent);
}
function mountComponent(initialVNode, container, parentComponent) {
    // 1. 创建组件实例, 为组件实例声明 setupStatus，props，slots，emit 等属性
    const instance = createComponentInstance(initialVNode, parentComponent);
    // 2. 处理组件实例，初始化组件的 props slots setupStatus
    setupComponent(instance);
    // 3.
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
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
            return createVNode(Fragment, {}, slot(props));
        }
        // return createVNode("div", {}, slot);
    }
}

function provide(key, value) {
    // 存
    // 因为 getCurrentInstance 函数只在 setup 作用域才有效，所以 provide 也是
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        // 初始化的时候，因为在 createComponentInstance 函数中对 组件实例属性 provides 进行了初始化（provides: parent ? parent.provides : {}）
        // 所以在初始化的时候 provides === parentProvides
        if (provides === parentProvides) {
            // 只需要赋值一次够了
            // 因为如果第二次调用 provide() 的时候还要创建一个以 parentProvides 为原型的对象,那么第一次 provides 又会被重置导致第一次赋值的 key 就没有了
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    // 取
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            else {
                return defaultValue;
            }
        }
    }
}

export { createApp, createTextVNode, getCurrentInstance, h, inject, provide, renderSlots };
