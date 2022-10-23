import { extend } from "../shared";

let activeEffect; // 存储 effect -> fn
let shouldTrack; // 判断当前是否应该收集依赖
export class ReactiveEffect {
  private _fn: any;
  deps = []; // 反向收集依赖,用于 stop 功能
  active = true; // 用 active 来判断是否已经调用过 stop(), true 则说明没有调用，反正则表示已经调用过，不需要再一次清空依赖了，属于优化的部分
  public scheduler: Function | undefined;
  onStop?: () => void;

  constructor(fn, scheduler?: Function) {
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
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });

  effect.deps.length = 0; // 属于优化操作,当 effect.deps 中的所有依赖被清除,effect.deps为 [set[0], set[0], set[0]], 此行为则可以释放内存空间.
}

const targetMap = new Map();

// 依赖收集
export function track(target, key) {
  if (!isTracking()) return;

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
export function trackEffects(dep) {
  // 如果 activeEffect 已经被添加过，那么就无需再次添加
  if (dep.has(activeEffect)) return;

  // 把 effect 添加到 dep 里实现依赖收集，那么到这一步就已经结束了依赖收集的动作
  dep.add(activeEffect);

  // 这里是反向收集依赖,用于 stop 功能
  activeEffect.deps.push(dep);
}

// 当前是否正在收集依赖
export function isTracking() {
  // if (!activeEffect) return;
  // if (!shouldTrack) return;
  return shouldTrack && activeEffect !== undefined;
}

// 触发依赖
export function trigger(target, key) {
  // 1. 获取依赖的 map 容器对象 depsMap
  let depsMap = targetMap.get(target);
  // 2. 获取 key 对应的所有依赖 dep
  let dep = depsMap.get(key);
  // 3. 遍历执行依赖的 run 或 scheduler 函数，从而更新视图
  triggerEffects(dep);
}

export function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

export function effect(fn, options: any = {}) {
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
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;

  return runner;
}

export function stop(runner) {
  runner.effect.stop();
}
