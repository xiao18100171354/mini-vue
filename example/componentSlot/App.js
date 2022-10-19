import { h } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export default {
  name: "App",
  render() {
    const app = h("div", {}, "App");
    // 支持单个slot
    // const foo = h(Foo, {}, h("p", {}, "123"));

    // 支持数组slots
    // const foo = h(Foo, {}, [h("p", {}, "123"), h("p", {}, "456")]);

    // 具名插槽
    // 支持把 slot 渲染到指定位置
    // 此时就用数组的方式，而是用 object
    // const foo = h(
    //   Foo,
    //   {},
    //   {
    //     header: h("p", {}, "header"),
    //     footer: h("p", {}, "footer"),
    //   }
    // );

    // 作用域插槽
    const foo = h(
      Foo,
      {},
      {
        header: (props) => h("p", {}, "header" + props.age),
        footer: (props) => h("p", {}, "footer"),
      }
    );

    return h("div", {}, [app, foo]);
  },

  setup() {
    return {};
  },
};
