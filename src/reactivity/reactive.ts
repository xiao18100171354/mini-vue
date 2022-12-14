import { isObject } from "../shared/index";
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";
import { track, trigger } from "./effect";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
}

export function reactive(raw) {
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

export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers);
  // return new Proxy(raw, {
  //   get: createGetter(true),
  //   set(target, key, value) {
  //     return true;
  //   },
  // });
}

export function shallowReadonly(raw) {
  return createActiveObject(raw, shallowReadonlyHandlers);
}

// 判断传入的参数是否为 reactive 对象
export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE];
}

// 判断传入的参数是否为 readonly
export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}

function createActiveObject(target: any, baseHandlers) {
  if (!isObject(target)) {
    console.warn(`target ${target} 必须是一个对象！`);
    return target;
  }

  return new Proxy(target, baseHandlers);
}
