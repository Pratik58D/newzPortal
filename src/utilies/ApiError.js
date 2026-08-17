export class ApiError extends Error {
  constructor(statusCode, message, cause) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;

    if (cause) {
      this.cause = cause;
    }
  }
}
