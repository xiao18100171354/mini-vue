const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
};

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    // setupStatus
    const { setupStatus } = instance;
    if (key in setupStatus) {
      return setupStatus[key];
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
