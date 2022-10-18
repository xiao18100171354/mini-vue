const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
};

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    // setupStatus
    const { setupStatus, props } = instance;

    const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);

    // if (key in setupStatus) {
    //   return setupStatus[key];
    // }
    if (hasOwn(setupStatus, key)) {
      return setupStatus[key];
    }

    // if (key in props) {
    //   return props[key];
    // }
    if (hasOwn(props, key)) {
      return props[key];
    }

    // if (key === "$el") {
    //   return instance.vnode.el;
    // }
    const publicGetter = publicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
