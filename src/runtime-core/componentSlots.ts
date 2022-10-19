import { ShapeFlags } from "../shared/ShapeFlags";

export function initSlots(instance, children) {
  // chidlren -> single | array
  // instance.slots = Array.isArray(children) ? children : [children];

  // normalizeObjectSlot(children, instance.slots);
  
  const { vnode } = instance;
  if (vnode.shapeFlags & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlot(children, instance.slots);
  }
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value];
}

function normalizeObjectSlot(children, slots) {
  // children -> object

  for (const key in children) {
    const value = children[key];
    slots[key] = (props) => normalizeSlotValue(value(props));
  }
}
