export function createRefreshCoordinator(
  refresh: () => Promise<void>,
): () => void {
  let isRefreshing = false;
  let refreshPending = false;

  async function runRefresh(): Promise<void> {
    isRefreshing = true;

    try {
      do {
        refreshPending = false;
        try {
          await refresh();
        } catch (error) {
          console.error(error);
        }
      } while (refreshPending);
    } finally {
      isRefreshing = false;
    }
  }

  return () => {
    if (isRefreshing) {
      refreshPending = true;
      return;
    }

    void runRefresh();
  };
}
