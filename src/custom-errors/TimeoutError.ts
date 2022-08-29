export class TimeoutError extends Error {
  constructor() {
    super("Timeout has occurred");
    this.name = "TimeoutError";
  }
}
