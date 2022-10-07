import { ReactiveEffect } from "./effect";

class ComputedRefImpl {
  private _getter;
  private _dirty: boolean = true; // 通过声明私有属性 _dirty 的方式来实现 computed 的缓存效果，只有当这个属性为 true 的时候，才会执行 _getter 函数，并且执行完后设置 _dirty 为 false，这样第二次触发 get 的时候，就不会去执行 _getter 函数了
  private _value: any;
  private _effect: ReactiveEffect;
  constructor(getter) {
    this._getter = getter;

    // this._effect = effect(); // 这里我们不能直接使用 effect()
    this._effect = new ReactiveEffect(getter, () => {
      // ! 利用 ReactiveEffect 的第二个参数 scheduler，来做一个功能，就是当响应式依赖对象的值被重新赋值时，不会再去执行第一个参数 fn，而是执行 scheduler
      // ! computed 这里的 scheduler 回调函数的逻辑是，当 _dirty 为 false 时，把它重置为 true。这样
      if (!this._dirty) {
        this._dirty = true;
      }
    }); // 而是使用 effect 底层的 ReactiveEffect 类，因为我们要做一些别的处理
  }

  get value() {
    // get
    // get value -> dirty true
    // 当依赖的响应式对象的值发生改变的时候
    // 利用 effect 收集起来
    if (this._dirty) {
      this._dirty = false;
      // this._value =  this._getter();
      this._value =  this._effect.run();
    }

    return this._value;
  }
}

// computed 函数接收一个 getter 参数
export function computed(getter) {
  return new ComputedRefImpl(getter);
}
