import { h } from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
  setup(props) {
    // props.count
    // 功能1. setup 函数接受一个参数 props
    console.log(props);


    // 功能3. props 不可以被修改，是 readonly
    props.count++;
    console.log(props)
  },

  render() {
    // 功能2. 在 render 函数中，可以通过 this 来访问 props 中的属性
    return h("div", {}, "foo: " + this.count);
  },
};
