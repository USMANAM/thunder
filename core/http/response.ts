export class Response extends globalThis.Response {
  static created(data: unknown, init?: ResponseInit) {
    return Response.json(data, init ?? { status: 201 });
  }

  static unauthorized(data?: BodyInit, init?: ResponseInit) {
    return new Response(data ?? "Unauthorized", init ?? { status: 401 });
  }
}
