export const extend = Object.assign;

export const isObject = (value) => {
  return value !== null && typeof value === "object";
};

export const hasChanged = (oldVal, newVal) => {
  return !Object.is(oldVal, newVal);
};

export const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
