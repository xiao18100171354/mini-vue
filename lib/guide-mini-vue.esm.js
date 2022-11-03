const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        component: null,
        key: props && props.key,
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

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (value) => {
    return value !== null && typeof value === "object";
};
const hasChanged = (oldVal, newVal) => {
    return !Object.is(oldVal, newVal);
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

let activeEffect; // 存储 effect -> fn
let shouldTrack; // 判断当前是否应该收集依赖
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = []; // 反向收集依赖,用于 stop 功能
        this.active = true; // 用 active 来判断是否已经调用过 stop(), true 则说明没有调用，反正则表示已经调用过，不需要再一次清空依赖了，属于优化的部分
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // 1. 会收集依赖
        //    shouldTrack 来做区分
        if (!this.active) {
            return this._fn();
        }
        // 应该进行依赖收集
        shouldTrack = true;
        // 把当前的 this -> fn 赋值给 activeEffect
        activeEffect = this;
        const result = this._fn();
        // reset
        shouldTrack = false;
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this); // 清空依赖
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0; // 属于优化操作,当 effect.deps 中的所有依赖被清除,effect.deps为 [set[0], set[0], set[0]], 此行为则可以释放内存空间.
}
const targetMap = new Map();
// 依赖收集
function track(target, key) {
    if (!isTracking())
        return;
    // target -> key -> dep
    let depsMap = targetMap.get(target); // 从全局变量 targetMap 中获取 target 对应的值
    if (!depsMap) {
        // 如果没有获取到，则初始化并且添加进 targetMap 中
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key); // 从 depsMap 中获取 key 对应的值
    if (!dep) {
        // 如果没有获取到，则初始化并且添加进 depsMap 中
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
// ! 依赖收集
function trackEffects(dep) {
    // 如果 activeEffect 已经被添加过，那么就无需再次添加
    if (dep.has(activeEffect))
        return;
    // 把 effect 添加到 dep 里实现依赖收集，那么到这一步就已经结束了依赖收集的动作
    dep.add(activeEffect);
    // 这里是反向收集依赖,用于 stop 功能
    activeEffect.deps.push(dep);
}
// 当前是否正在收集依赖
function isTracking() {
    // if (!activeEffect) return;
    // if (!shouldTrack) return;
    return shouldTrack && activeEffect !== undefined;
}
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
function effect(fn, options = {}) {
    // fn
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // ! 不够优雅：是直接将options.onStop赋值给_effect.onStop，后面还会有很多的options，所以这种方式不是很好
    // _effect.onStop = options.onStop();
    // ! 稍微优雅：可以通过Object.assign()更加优雅的实现以上代码的逻辑
    // Object.assign(_effect, options);
    // ! 封装逻辑：extend
    extend(_effect, options);
    // 调用 effect() 函数时，fn 会被调用一次
    _effect.run();
    // apply call 绑定this，并且立即执行这个绑定过this的函数
    // bind 绑定this，并且返回该函数
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
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
        // ! 使用 isReadonly 入参来判断是 reactive 还是 readonly
        // 如果对象是只读的，说明无法被修改，那么就不用进行依赖收集了
        if (!isReadonly) {
            // 如果不是 readonly
            // ! 依赖收集
            track(target, key);
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

// 1 true "1" ref 接收的是基本数据类型
// get set 但是 ref 仍要使用 get 和 set 进行依赖收集和触发依赖
// proxy -> object proxy 接收的是一个对象，这样就无法对基本数据类型使用
// {} -> value get set 所以要通过 RefImpl 将基本类型数据转换成对象的形式，变相实现基本数据类型的 get 和 set
class RefImpl {
    constructor(value) {
        this.__v_isRef = true; // 用于判断是否为 ref 对象,只要通过 RefImpl 创建的对象,就会含有 __v_isRef 属性,代表它是一个 ref 对象
        this._rawValue = value;
        // 在 ref 实现中,如果 value 是一个对象, 则需要把 value 转换成 reactive
        // 1. 看看 value 是不是对象
        this._value = convert(value);
        this.dep = new Set(); // 用于依赖收集
    }
    get value() {
        // 依赖收集
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 新的值等于老的值,则不需要重新赋值,也就不需要重新触发依赖.
        // hasChanged
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    // 如果 RefImpl 接收的参数是一个对象，则需要用 reactive 进行处理一下
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
    // const a = ref(1) -> a.value
    // return {
    //   value,
    // };
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    // 如果是 ref 对象,则返回 ref.value
    // 不是 ref 对象则返回自身
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRef) {
    return new Proxy(objectWithRef, {
        get(target, key) {
            // get -> age (ref) 那么就给他返回 .value
            // not ref 则返回 -> value
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            // set -> age (ref) 那么就要修改 .value
            if (isRef(target[key]) && !isRef(value)) {
                // 判断之前 key 对应的值是 ref 对象,且新的value不是 ref 对象,则直接替换
                return (target[key].value = value);
            }
            else {
                // 如果新的 value 是 ref 对象,那么无论之前 key 对应的值是不是 ref 对象,都可以直接赋值
                return Reflect.set(target, key, value);
            }
        },
    });
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
    $props: (i) => i.props,
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
        next: null,
        setupStatus: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        isMounted: false,
        subTree: {},
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
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
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
            // 通过原型链的方式实现
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    // 取
    // 作用域同 provide
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        // inject 取的 key 至少是从父级组件通过 provide 提供
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

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

// import { render } from "./renderer";
function createAppAPI(render) {
    return function createApp(rootComponent) {
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
    };
}
/*
createApp 返回一个 app 对象
*/
// export function createApp(rootComponent) {
//   return {
//     mount(rootContainer) {
//       // 先转换成 vnode
//       //    compoent -> vnode
//       // 后续所有的操作，都是基于 vnode 做处理
//       // document.querySelector(rootContainer);
//       const vnode = createVNode(rootComponent);
//       render(vnode, rootContainer);
//     },
//   };
// }

const queue = [];
let isFlushPending = false;
const p = Promise.resolve();
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
// job 其实就是 effect 返回的函数
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    // Promise.resolve().then(() => {
    //   isFlushPending = false;
    //   let job;
    //   while ((job = queue.shift())) {
    //     job && job();
    //   }
    // });
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProps: hostPatchProps, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container) {
        // render 函数其实就干了一件事情，就是调用 patch() 方法
        // patch() 方便后续进行递归的处理
        patch(null, vnode, container, null, null);
    }
    // n1 -> old vnode
    // n2 -> new vnode
    function patch(n1, n2, container, parentComponent, anchor) {
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
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                // 纯文本类型 -> 只需要将文本添加到容器中即可
                processText(n1, n2, container);
                break;
            default:
                // 通过 ShapeFlags 改在判断代码
                if (shapeFlags & 1 /* ShapeFlags.ELEMENT */) {
                    // type => div p span 等等 html 标签
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlags & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // type => 组件类型, App Foo 等
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    function processText(n1, n2, container) {
        // children 其实就是 字符串
        const { children } = n2;
        const textNode = document.createTextNode(children);
        n2.el = textNode;
        container.append(textNode);
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        // 只需要处理 children
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    // 处理元素入口方法
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log("patchElement");
        console.log("n1", n1);
        console.log("n2", n2);
        // el 可以从 n1 上去获取，因为在 mountElement 做处理的时候，会为 n1 添加 el属性，
        // 但是 n2 不会通过 mountElement 处理，所以没办法添加 el 属性
        // 所以 n2 添加 el 属性的时间点就是在 patchElement 的时候，把 n1.el => n2.el
        const el = n1.el;
        n2.el = n1.el;
        // children
        patchChildren(n1, n2, el, parentComponent, anchor);
        // props
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        patchProps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlags;
        const c1 = n1.children;
        const { shapeFlags } = n2;
        const c2 = n2.children;
        if (shapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // new text
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 1. 把老的 children 清空
                unmountChildren(n1.children);
                // 2. 设置成新的 text
                hostSetElementText(container, c2);
            }
            else {
                if (c1 !== c2) {
                    hostSetElementText(container, c2);
                }
            }
        }
        else {
            // new array
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // 1. 清空旧的文本
                hostSetElementText(container, "");
                // 2. 挂载新的 array children
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // array diff array
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        const l2 = c2.length;
        let i = 0; // 声明变量表示新数组 c2 的第一个 children
        let e1 = c1.length - 1; // 声明变量表示旧数组 c1 的最后一个 children
        let e2 = l2 - 1; // 声明变量表示新数组 c2 的最后一个 children
        function isSameVNodeType(n1, n2) {
            // 判断 vnode 的 type 属性是不是一样
            // 1. 对比 type 属性的值
            // 2. 对比 key
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 左侧
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // console.log(i);
        // 右侧
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 经过上面的双端对比，结果产生一个缩小范围的需要真的进行处理的范围
        // 新的比老的多 - 创建
        if (i > e1) {
            if (i <= e2) {
                // const nextPos = i + 1;
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            // 中间对比
            let s1 = i; // 老节点的需要对比的元素的开始索引
            let s2 = i; // 新节点的需要对比的元素的开始索引
            const toBePatched = e2 - s2 + 1; // 记录需要对比的节点数量
            let patched = 0; // 记录当前已经对比了几个节点，如果 patched >=
            // 建立 key 和 child 的映射关系
            const keyToNewIndexMap = new Map();
            // 创建一个定长的数组来存放新老节点的映射关系
            const newIndexToOldIndex = new Array(toBePatched);
            let moved = false;
            let maxNewIndexSoFar = 0;
            // 初始化映射表
            // 为每个索引值都初始化一个0，表示还没有建立映射关系
            for (let i = 0; i < toBePatched; i++) {
                newIndexToOldIndex[i] = 0;
            }
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                // 把节点的 key 属性和节点在 children 里的索引建立映射关系
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 循环遍历老数据，如果老数组中的节点不在新数组中，则直接删除
            // 如果在新数组中，先从 keyToNewIndexMap 找出它在新数组中的索引位置，然后再进行 patch() 更新
            // 也会后续的移动节点做准备
            for (let i = s1; i <= e1; i++) {
                // 先把老 children 中对应索引位置的节点取出来用变量保存起来
                const prevChild = c1[i];
                if (patched >= toBePatched) {
                    // 如果已经对比节点树大于等于需要对比的节点数，那么就说明老的比新的多一些节点，需要删除
                    hostRemove(prevChild.el);
                    continue; // 停止当前循环，立刻进行下一次循环
                }
                // null undefined
                let newIndex; // 如果老的里面的节点在新的节点里，声明变量来存放它在新的里面的索引，否则就为 undefined
                if (prevChild.key !== null) {
                    // 如果老节点有 key，那么直接从 keyToNewIndexMap get
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 如果没有 key，则循环遍历 新数据中需要中间对比的范围，看看范围内有没有它
                    // for (let j = s2; j < e2; j++) {
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break; // 跳出当前循环
                        }
                    }
                }
                if (newIndex === undefined) {
                    // 经过上述的两个判断，如果 newIndex 还是 undefined
                    // 说明不在新的节点内，直接删除
                    hostRemove(prevChild.el);
                }
                else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    newIndexToOldIndex[newIndex - s2] = i + 1; // 加 1 是为了避免 i 为 0 的情况，因为0在后续中有用
                    // 如果老的节点在新的节点中存在，那么就进行 patch
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndex)
                : []; // 获取最长递增子序列
            let j = increasingNewIndexSequence.length - 1; // 最长递增子序列的指针，从末尾开始
            // 也是从末尾开始进行节点移动
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null; // 获取锚点位置，用于要移动节点的参考节点
                if (newIndexToOldIndex[i] === 0) {
                    // 中间对比 - 创建
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 中间对比 - 移动
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        console.log("移动位置");
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            // remove
            hostRemove(el);
        }
    }
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== nextProp) {
                    hostPatchProps(el, key, prevProp, nextProp);
                }
            }
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProps(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
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
        if (shapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(children, el, parentComponent, anchor);
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
            hostPatchProps(el, key, null, val);
        }
        // container.append(el);
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((child) => {
            patch(null, child, container, parentComponent, anchor);
        });
    }
    // 处理组件入口方法
    function processComponent(n1, n2, container, parentComponent, anchor) {
        // 挂载组件
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateCompoent(n1, n2);
        }
    }
    function updateCompoent(n1, n2) {
        const instance = n1.component;
        n2.component = n1.component;
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        // 1. 创建组件实例, 为组件实例声明 setupStatus，props，slots，emit 等属性
        const instance = createComponentInstance(initialVNode, parentComponent);
        initialVNode.component = instance;
        // 2. 处理组件实例，初始化组件的 props slots setupStatus
        setupComponent(instance);
        // 3.
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        // 利用 effect 进行依赖收集
        // 组件的 render 函数，会使用响应式对象中的属性
        // 这时候把逻辑放到 effect 中，就可以当响应式对象属性触发 get 时进行依赖收集，set 时触发依赖
        instance.update = effect(() => {
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
                patch(null, subTree, container, instance, anchor);
                // 所有的 element 都已经处理完成
                initialVNode.el = subTree.el;
                // 初始化结束，把组件实例 isMounted 属性设置为 true
                instance.isMounted = true;
            }
            else {
                // 已经挂载过了，需要更新
                console.log("update");
                // 更新组件的 props
                const { next, vnode } = instance; // next 是马上要更新的，vnode 是更新之前的
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                const preSubTree = instance.subTree;
                instance.subTree = subTree; // 把最新的虚拟节点树赋值给 subTree
                patch(preSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                // 实现 nextTick 功能
                // 在响应式对象更新的时候，不要立即触发依赖
                // 而是通过一个容器收集这些更新job
                // 然后通过微任务的方式，当宏任务全部更新之后
                // 执行微任务来进行视图的更新
                console.log("update - scheduler");
                queueJobs(instance.update);
            }
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
}
// 最长递增子序列算法
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createElement(type) {
    return document.createElement(type);
}
function patchProps(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        // 注册事件 onClick onMouseOver 等
        el.addEventListener(event, nextVal);
    }
    else {
        // 处理常规属性 id class 等
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(el, container, anchor) {
    // container.append(el);
    container.insertBefore(el, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(container, text) {
    container.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProps,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, nextTick, provide, proxyRefs, ref, renderSlots };
