import server from "./serve.base.ts";

export default {
  async fetch(req) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const res = await server(req);

    // Append CORS headers to the response
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.headers.set(key, value);
    }

    return res;
  },
} satisfies Deno.ServeDefaultExport;
