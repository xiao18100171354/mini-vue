import { effect, stop } from "../effect";
import { reactive } from "../reactive";

describe("effect", () => {
  it("happy path", () => {
    const user = reactive({
      age: 10,
    });
    let nextAge;

    effect(() => {
      nextAge = user.age + 1;
    });

    expect(nextAge).toBe(11);

    // update
    user.age++;
    expect(nextAge).toBe(12);
  });

  it("should return runner when call effect", () => {
    // 1. effect(fn) -> function (runner) -> fn -> return
    let foo = 10;
    const runner = effect(() => {
      foo++;
      return "foo";
    });

    expect(foo).toBe(11);
    let r = runner();
    expect(foo).toBe(12);
    expect(r).toBe("foo");
  });

  it("should scheduler", () => {
    // 1. 通过 effect 的第二个参数给定的一个 scheduler 的 fn
    // 2. 当 effect 第一次执行的时候，还会执行第一个参数 fn
    // 3. 当响应式对象发生 set 的时候，不会执行第一个参数 fn，而是执行第二个参数 scheduler fn
    // 4. 如果说当执行 runner 的时候，会再次执行第一个参数 fn
    let dummy;
    let run: any;
    const obj = reactive({
      foo: 1,
    });

    const scheduler = jest.fn(() => {
      run = runner;
    });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      {
        scheduler,
      }
    );

    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);
    run();
    expect(dummy).toBe(2);
  });

  it("stop", () => {
    let dummy;
    const obj = reactive({
      prop: 1,
    });
    const runner = effect(() => {
      dummy = obj.prop;
    });
    obj.prop = 2;
    expect(dummy).toBe(2);
    stop(runner);
    obj.prop = 3;
    expect(dummy).toBe(2);

    // stopped effect should still be manually callable：停止的 effect 仍应可以手动调用
    runner();
    expect(dummy).toBe(3);
  });

  it("onStop", () => {
    // effect 接受第二个参数，当 stop 被调用的时候，第二个参数 onStop 应该被调用
    let dummy;
    const obj = reactive({
      prop: 1,
    });
    const onStop = jest.fn();
    const runner = effect(() => {
      dummy = obj.prop;
    }, {
      onStop
    });
    stop(runner);
    expect(onStop).toBeCalledTimes(1);
  });
});
