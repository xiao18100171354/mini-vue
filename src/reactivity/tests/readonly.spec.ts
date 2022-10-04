import { readonly } from "../reactive";

describe('readonly', () => {
  it("happy path", () => {
    // 只读，意思就是不允许被 set，就是不会触发依赖，那么也就没有必要做依赖收集了
    const original = {foo: 1};
    const observed = readonly(original);
    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);
  });
});