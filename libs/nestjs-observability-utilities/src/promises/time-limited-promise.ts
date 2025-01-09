export function timeLimitedPromise<T>(
  inputPromise: Promise<T>,
  interval: number = 500, // how long to wait for the promise
  timedOutReturnValue: T | undefined = undefined,
) {
  const timeoutPromise: Promise<T | undefined> = new Promise((resolve) => {
    setTimeout(() => {
      resolve(timedOutReturnValue);
    }, interval);
  });
  //return inputPromise;
  return Promise.race([inputPromise, timeoutPromise]);
}
