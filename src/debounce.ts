export function debounce(callback: () => void, delay: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return () => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(callback, delay);
  };
}
