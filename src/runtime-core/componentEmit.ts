import { camelize, toHandlerKey } from "../shared/index";

export function emit(instance, event, ...args) {
  console.log("emit", event);

  // instance.props -> event
  const { props } = instance;

  // if (hasOwn()) {}

  // TPP
  // 先去写一个特定的行为，再去重构成通用的行为
  // add -> Add
  // add-foo -> addFoo
  

  const handlerName = toHandlerKey(camelize(event));
  const handler = props[handlerName];
  handler && handler(...args);
}
