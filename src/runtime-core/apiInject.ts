import { getCurrentInstance } from "./component";

export function provide(key, value) {
  // 存
  // 因为 getCurrentInstance 函数只在 setup 作用域才有效，所以 provide 也是
  const currentInstance: any = getCurrentInstance();

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

export function inject(key, defaultValue) {
  // 取
  // 作用域同 provide
  const currentInstance: any = getCurrentInstance();
  if (currentInstance) {
    // inject 取的 key 至少是从父级组件通过 provide 提供
    const parentProvides = currentInstance.parent.provides;

    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultValue) {
      if (typeof defaultValue === "function") {
        return defaultValue();
      } else {
        return defaultValue;
      }
    }
  }
}
