import { h } from "../../lib/guide-mini-vue.esm.js";

window.self = null;
export default {
  // <template></template> 需要编译能力
  // render

  render() {
    window.self = this;
    // ui
    return h(
      "div",
      {
        id: "root",
        class: ["red", "hard"],
      },
      "hi, " + this.msg
      // [h("p", { class: "red" }, "hi"), h("p", { class: "blue" }, "mini-vue")]
    );
  },

  setup() {
    // composition api

    return {
      msg: "mini-vue",
    };
  },
};

// ! 1. 处理组件（processComponent）
// ! 2. 处理元素（processElement）
