export default {
  // <template></template> 需要编译能力
  // render

  render(h) {
    // ui
    return h("div", "hi, " + this.msg);
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