// Restricción de acceso básica (equivalente a .htpasswd) para todo el sitio.
// Las credenciales viven en variables de entorno de Vercel: BASIC_AUTH_USER y BASIC_AUTH_PASSWORD.
// Si no están definidas, el sitio queda cerrado (responde 401 siempre).

export const config = { matcher: '/:path*' };

// Comparación que recorre siempre la cadena completa para no filtrar información por tiempo.
function safeEqual(a, b) {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function unauthorized() {
  return new Response('Acceso restringido.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Visor PET", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

export default function middleware(request) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !pass) return unauthorized();

  const header = request.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (!encoded || scheme.toLowerCase() !== 'basic') return unauthorized();

  let decoded;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0)));
  } catch {
    return unauthorized();
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return unauthorized();

  const okUser = safeEqual(decoded.slice(0, sep), user);
  const okPass = safeEqual(decoded.slice(sep + 1), pass);
  if (!(okUser && okPass)) return unauthorized();
  // Sin respuesta: Vercel continúa y sirve el archivo estático.
}
