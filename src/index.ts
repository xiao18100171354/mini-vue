// mini-vue 整个程序的出口
// export * from "./runtime-core"; // 因为 runtime-core 属于是 runtime-dom 的底层依赖,这里把 runtime-core 转移到了 runtime-dom 里导出
export * from "./runtime-dom";

import { baseCompile } from "./complier-core/src";
import * as runtimeDom from "./runtime-dom";
import { registerRuntimeCompiler } from "./runtime-dom";

function complieToFunction(template) {
  const { code } = baseCompile(template);

  const render = new Function("Vue", code)(runtimeDom);
  return render;
}

registerRuntimeCompiler(complieToFunction);
