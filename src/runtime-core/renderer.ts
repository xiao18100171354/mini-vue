import { effect } from "../reactivity/effect";
import { EMPTY_OBJ, isObject } from "../shared/index";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProps: hostPatchProps,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options;

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
        if (shapeFlags & ShapeFlags.ELEMENT) {
          // type => div p span 等等 html 标签
          processElement(n1, n2, container, parentComponent, anchor);
        } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
          // type => 组件类型, App Foo 等
          processComponent(n1, n2, container, parentComponent, anchor);
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

  function processFragment(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    // 只需要处理 children
    mountChildren(n2.children, container, parentComponent, anchor);
  }

  // 处理元素入口方法
  function processElement(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor);
    } else {
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
    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      // new text
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 1. 把老的 children 清空
        unmountChildren(n1.children);
        // 2. 设置成新的 text
        hostSetElementText(container, c2);
      } else {
        if (c1 !== c2) {
          hostSetElementText(container, c2);
        }
      }
    } else {
      // new array
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 1. 清空旧的文本
        hostSetElementText(container, "");
        // 2. 挂载新的 array children
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        // array diff array
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
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
      } else {
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
      } else {
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
    } else if (i > e2) {
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else {
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
        } else {
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
        } else {
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
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
        } else if (moved) {
          // 中间对比 - 移动
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            console.log("移动位置");
            hostInsert(nextChild.el, container, anchor);
          } else {
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

  function mountElement(vnode: any, container: any, parentComponent, anchor) {
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
  function processComponent(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    // 挂载组件
    mountComponent(n2, container, parentComponent, anchor);
  }

  function mountComponent(
    initialVNode: any,
    container,
    parentComponent,
    anchor
  ) {
    // 1. 创建组件实例, 为组件实例声明 setupStatus，props，slots，emit 等属性
    const instance = createComponentInstance(initialVNode, parentComponent);
    // 2. 处理组件实例，初始化组件的 props slots setupStatus
    setupComponent(instance);
    // 3.
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  function setupRenderEffect(instance: any, initialVNode, container, anchor) {
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
        patch(null, subTree, container, instance, anchor);

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

        patch(preSubTree, subTree, container, instance, anchor);
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}

// 最长递增子序列算法
function getSequence(arr: number[]): number[] {
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
        } else {
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
