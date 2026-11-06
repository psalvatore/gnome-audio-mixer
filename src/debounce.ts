type DebouncedFunction = (() => void) & {
  cancel: () => void;
};

export function debounce(
  callback: () => void,
  delay: number,
): DebouncedFunction {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = undefined;
      callback();
    }, delay);
  };

  debounced.cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return debounced;
}
