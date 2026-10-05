import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/** Basic Auth: solo se activa si BASIC_AUTH_USER y BASIC_AUTH_PASSWORD están definidas. */
function verificarBasicAuth(request: Request): Response | null {
  const usuario = process.env["BASIC_AUTH_USER"];
  const clave = process.env["BASIC_AUTH_PASSWORD"];
  if (!usuario || !clave) return null;
  const encabezado = request.headers.get("authorization") ?? "";
  if (encabezado.startsWith("Basic ")) {
    try {
      const [u, ...resto] = atob(encabezado.slice(6)).split(":");
      if (u === usuario && resto.join(":") === clave) return null;
    } catch {
      // credenciales mal formadas
    }
  }
  return new Response("Autenticación requerida", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Visor PET", charset="UTF-8"' },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const denegado = verificarBasicAuth(request);
    if (denegado) return denegado;
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
