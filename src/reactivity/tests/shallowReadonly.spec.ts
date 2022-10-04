import { isReadonly, shallowReadonly } from "../reactive";

describe("shallowReadonly", () => {
  it("should not make non-reactive properties reactive", () => {
    const props = shallowReadonly({ n: { foo: 1 } });
    expect(isReadonly(props)).toBe(true);
    expect(isReadonly(props.n)).toBe(false);
  });

  it("warn when call set", () => {
    // console.warn();
    // mock
    console.warn = jest.fn();

    const user = shallowReadonly({
      age: 27,
    });

    user.age = 28;

    expect(console.warn).toBeCalled();
  });
});
