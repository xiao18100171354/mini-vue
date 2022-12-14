import { extend, isObject } from "../shared";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlags, readonly } from "./reactive";

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

// ! 封装 getter 函数
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key) {
    // ! isReactive() 功能实现 和 isReadonly() 功能实现
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
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

export const mutableHandlers = {
  get,
  set,
};

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn(`key:${key} set 失败 因为targer是readonly`, target);
    return true;
  },
};

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet,
});
