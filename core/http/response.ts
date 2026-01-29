export class Response extends globalThis.Response {
  static created(data: unknown, init?: ResponseInit) {
    return Response.json(data, init ?? { status: 201 });
  }
}
