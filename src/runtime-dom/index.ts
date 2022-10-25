import { createRenderer } from "../runtime-core";

function createElement(type) {
  return document.createElement(type);
}

function patchProps(el, key, prevVal, nextVal) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    // 注册事件 onClick onMouseOver 等
    el.addEventListener(event, nextVal);
  } else {
    // 处理常规属性 id class 等
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextVal);
    }
  }
}

function insert(el, container) {
  container.append(el);
}

const renderer: any = createRenderer({ createElement, patchProps, insert });


export function createApp(...args) {
  return renderer.createApp(...args);
}

export * from "../runtime-core";
