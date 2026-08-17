export class ApiError extends Error {
  constructor(status, message, cause) {
    super(message);
    this.status = status;
    if (cause) this.cause = cause; // keeps the original error for server-side logging
  }
}
