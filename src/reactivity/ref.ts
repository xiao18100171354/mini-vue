import { hasChanged, isObject } from "../shared";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

// 1 true "1"
// get set
// proxy -> object
// {} -> value get set

class RefImpl {
  private _value: any;
  public dep; // ref 中,一个key 必须对应一个 dep
  private _rawValue: any;
  constructor(value) {
    this._rawValue = value;
    // 在 ref 实现中,如果 value 是一个对象, 则需要把 value 转换成 reactive
    // 1. 看看 value 是不是对象
    this._value = convert(value);
    this.dep = new Set();
  }

  get value() {
    // 依赖收集
    trachRefValue(this);
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
  return isObject(value) ? reactive(value) : value;
}

function trachRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

export function ref(value) {
  return new RefImpl(value);
  // return {
  //   value,
  // };
}
