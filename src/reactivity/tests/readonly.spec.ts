import { isReadonly, readonly } from "../reactive";

describe("readonly", () => {
  it("happy path", () => {
    // 只读，意思就是不允许被 set，就是不会触发依赖，那么也就没有必要做依赖收集了
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original);
    expect(wrapped.foo).toBe(1);
    expect(isReadonly(wrapped)).toBe(true);

    expect(isReadonly(wrapped.bar)).toBe(true);
    expect(isReadonly(original.bar)).toBe(false);
  });

  it("warn when call set", () => {
    // console.warn();
    // mock
    console.warn = jest.fn();

    const user = readonly({
      age: 27,
    });

    user.age = 28;

    expect(console.warn).toBeCalled();
  });
});
