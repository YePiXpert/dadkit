export class HttpBoundaryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpBoundaryError";
  }
}
