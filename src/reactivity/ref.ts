import { hasChanged, isObject } from "../shared";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

// 1 true "1" ref 接收的是基本数据类型
// get set 但是 ref 仍要使用 get 和 set 进行依赖收集和触发依赖
// proxy -> object proxy 接收的是一个对象，这样就无法对基本数据类型使用
// {} -> value get set 所以要通过 RefImpl 将基本类型数据转换成对象的形式，变相实现基本数据类型的 get 和 set

class RefImpl {
  private _value: any; // 存储 ref 接收基本数据类型的值
  public dep; // 用于存放依赖：ref 中,一个 key 必须对应一个 dep
  private _rawValue: any; // 存储未处理过的 value，用于 set 时的比较
  public __v_isRef = true; // 用于判断是否为 ref 对象,只要通过 RefImpl 创建的对象,就会含有 __v_isRef 属性,代表它是一个 ref 对象
  constructor(value) {
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

export function ref(value) {
  return new RefImpl(value);
  // const a = ref(1) -> a.value
  // return {
  //   value,
  // };
}

export function isRef(ref) {
  return !!ref.__v_isRef;
}

export function unRef(ref) {
  // 如果是 ref 对象,则返回 ref.value
  // 不是 ref 对象则返回自身
  return isRef(ref) ? ref.value : ref;
}

export function proxyRefs(objectWithRef) {
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
      } else {
        // 如果新的 value 是 ref 对象,那么无论之前 key 对应的值是不是 ref 对象,都可以直接赋值
        return Reflect.set(target, key, value);
      }
    },
  });
}
