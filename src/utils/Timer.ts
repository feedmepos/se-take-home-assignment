export class Timer {
  setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
    return setTimeout(callback, delay);
  }

  clearTimeout(timeoutId: ReturnType<typeof setTimeout>): void {
    clearTimeout(timeoutId);
  }
}
