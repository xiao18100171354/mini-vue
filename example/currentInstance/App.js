import { h, getCurrentInstance } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export default {
  name: "App",
  render() {
    const foo = h(Foo);
    return h("div", {}, [h("p", {}, "currentInstance demo"), foo]);
  },

  setup() {
    const instance = getCurrentInstance();
    console.log("App: ", instance);
  },
};
