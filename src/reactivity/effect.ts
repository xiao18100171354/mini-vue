import { extend } from "../shared";

let activeEffect;
let shouldTrack;
class ReactiveEffect {
  private _fn: any;
  deps = [];
  active = true;
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

    shouldTrack = true;
    activeEffect = this;

    const result = this._fn();
    // reset
    shouldTrack = false;

    return result;
  }

  stop() {
    if (this.active) {
      cleanupEffect(this);
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
  effect.deps.length = 0;
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

  // 如果 activeEffect 已经被添加过，那么就无需再次添加
  if (dep.has(activeEffect)) return;
  
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}

function isTracking () {
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