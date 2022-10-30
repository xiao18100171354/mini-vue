import { h } from "../../lib/guide-mini-vue.esm.js";

export const Child = {
  name: "Child",
  setup() {
    return {};
  },

  render() {
    return h("div", {}, [
      h("div", {}, "child - props - msg: " + this.$props.msg),
    ]);
  },
};
