// import { render } from "./renderer";
import { createVNode } from "./vnode";

export function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        // 先转换成 vnode
        //    compoent -> vnode
        // 后续所有的操作，都是基于 vnode 做处理
        // document.querySelector(rootContainer);

        const vnode = createVNode(rootComponent);

        render(vnode, rootContainer);
      },
    };
  };
}

/* 
createApp 返回一个 app 对象
*/
// export function createApp(rootComponent) {
//   return {
//     mount(rootContainer) {
//       // 先转换成 vnode
//       //    compoent -> vnode
//       // 后续所有的操作，都是基于 vnode 做处理
//       // document.querySelector(rootContainer);

//       const vnode = createVNode(rootComponent);

//       render(vnode, rootContainer);
//     },
//   };
// }
