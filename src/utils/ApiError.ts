export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string, cause?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;

    if (cause) {
      this.cause = cause;
    }
  }
}
