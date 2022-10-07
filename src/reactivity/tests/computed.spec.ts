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
    const cValue = computed(getter);

    // ! lazy 懒执行：如果没有调用 cValue.value 的话，getter 函数不会调用
    expect(getter).not.toHaveBeenCalled();

    expect(cValue.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute until needed
    value.foo = 2; // 这里有一个问题，就是我们没有进行依赖收集，会报错。 trigger -> effect.run()，所以我们需要进行依赖收集，这里进行依赖收集的另一个好处就是，当我们访问计算属性 .value 的时候，会重新执行 get ，然后重新赋值
    expect(getter).toHaveBeenCalledTimes(1);

    // now it should compute
    expect(cValue.value).toBe(2); // 这里就反应了上述依赖收集的好处
    expect(getter).toHaveBeenCalledTimes(2);

    // should not compute again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
});
