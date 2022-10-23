import { computed } from "../computed";
import { reactive } from "../reactive";

describe("computed", () => {
  it("happy path", () => {
    // 计算属性类似与 ref
    // 调用的时候都是使用 .value 的方式

    // ! 1. 缓存
    const user = reactive({
      age: 1,
    });

    const age = computed(() => {
      return user.age;
    });

    expect(age.value).toBe(1);
  });

  it("should compute lazily", () => {
    const value = reactive({
      foo: 1,
    });

    const getter = jest.fn(() => {
      return value.foo;
    })

    // computed() 函数返回一个 ComputedRefImpl 实例对象
    const cValue = computed(getter);

    // ! lazy 懒执行：如果没有调用 cValue.value 的话，getter 函数不会调用
    expect(getter).not.toHaveBeenCalled();

    // 进行依赖收集，并且将 cValue._dirty -> false
    expect(cValue.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute again
    // 因为 cValue._dirty => false
    // 所以不会再执行 getter
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute until needed
    // 当响应式对象被重新赋值时
    // 首先会触发依赖，因为内部实现 computed 时使用了 ReactiveEffect 类并且传递了 scheduler
    // 所以就不会执行 getter 而是 执行 scheduler，讲 cValue._dirty => true
    value.foo = 2; // 这里有一个问题，就是我们没有进行依赖收集，会报错。 trigger -> effect.run()，所以我们需要进行依赖收集，这里进行依赖收集的另一个好处就是，当我们访问计算属性 .value 的时候，会重新执行 get ，然后重新赋值
    expect(getter).toHaveBeenCalledTimes(1);

    // now it should compute
    // 当再次获取 cValue.value 时，因为此时 cValue._dirty 已经是 true
    // 所以又会执行一次 getter，然后 cValue._value 会被赋予最近的值，并且将 cValue._dirty 重新设置为 false
    expect(cValue.value).toBe(2); // 这里就反应了上述依赖收集的好处
    expect(getter).toHaveBeenCalledTimes(2);

    // should not compute again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
});
