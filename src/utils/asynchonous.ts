interface RunWithDelayOptions<T> {
  fn: () => Promise<T> | T;
  beforeDelay?: number;
  afterDelay?: number;
  onStart?: () => void;
  onComplete?: (result: T) => void;
}

const sleep = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));

const delayExecution = async (delay: number) => {
  console.log('Starting...');
  await sleep(delay); // 10000
  console.log('10 seconds have passed');
}

const runWithDelay = async <T>({
  fn,
  beforeDelay = 0,
  afterDelay = 0,
  onStart,
  onComplete
}: RunWithDelayOptions<T>): Promise<T> => {
  if (onStart) onStart();
  if (beforeDelay > 0) await sleep(beforeDelay);
  
  const result = await fn();
  if (afterDelay > 0) await sleep(afterDelay);
  if (onComplete) onComplete(result);
  
  return result;
};

export {
  delayExecution,
  runWithDelay,
}
