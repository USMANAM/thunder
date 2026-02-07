export class Response extends globalThis.Response {
  static ok(data?: BodyInit, init?: ResponseInit) {
    return new Response(data ?? "Ok", init ?? { status: 200 });
  }

  static created(data: unknown, init?: ResponseInit) {
    return Response.json(data, init ?? { status: 201 });
  }

  static unauthorized(data?: BodyInit, init?: ResponseInit) {
    return new Response(data ?? "Unauthorized", init ?? { status: 401 });
  }
}
