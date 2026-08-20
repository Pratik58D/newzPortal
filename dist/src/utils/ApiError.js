export class ApiError extends Error {
    statusCode;
    constructor(statusCode, message, cause) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        if (cause) {
            this.cause = cause;
        }
    }
}
//# sourceMappingURL=ApiError.js.map