const ShapeFlags = {
  element: 0,
  stateful_component: 0,
  text_children: 0,
  array_children: 0,
};



// vnode = stateful_component
// 1. 设置 修改
// ShapeFlags.stateful_component = 1;
// ShapeFlags.array_children = 1;


// 2. 查询
if (ShapeFlags.element) {
  // 是 element 类型
} else if (ShapeFlags.stateful_component) {
  // 是 stateful_component 类型
}



// 位运算
// 0000
// 0001 -> element
// 0010 -> stateful_component
// 0100 -> text_children
// 1000 -> array_children


// 1010 -> stateful_component / array_children
