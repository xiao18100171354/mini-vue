const queue: any = [];

let isFlushPending = false;

const p = Promise.resolve();

export function nextTick(fn) {
  return fn ? p.then(fn) : p;
}

// job 其实就是 effect 返回的函数
export function queueJobs(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }

  queueFlush();
}

function queueFlush() {
  if (isFlushPending) return;

  isFlushPending = true;

  // Promise.resolve().then(() => {
  //   isFlushPending = false;
  //   let job;
  //   while ((job = queue.shift())) {
  //     job && job();
  //   }
  // });

  nextTick(flushJobs);
}

function flushJobs() {
  isFlushPending = false;
  let job;
  while ((job = queue.shift())) {
    job && job();
  }
}
