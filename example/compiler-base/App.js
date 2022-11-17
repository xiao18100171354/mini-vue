import { ref } from "../../lib/guide-mini-vue.esm.js";

export default {
  template: `<div>hi,{{count}}</div>`,
  setup() {
    let count = ref(0);

    window.count = count;
    return {
      count,
    };
  },
};
