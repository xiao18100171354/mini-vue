import { mutableHandlers, readonlyHandlers } from "./baseHandlers";
import { track, trigger } from "./effect";

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

function createActiveObject(raw: any, baseHandlers) {
  return new Proxy(raw, baseHandlers);
}
