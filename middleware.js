// Vercel Edge Middleware — 簡易Basic認証
// 環境変数 BASIC_AUTH_PASSWORD が設定されている場合のみ有効
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };

export default function middleware(request) {
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!password) return; // 未設定なら認証スキップ

  const auth = request.headers.get('authorization');
  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      // user:password 形式（userは任意）
      const [, pwd] = decoded.split(':');
      if (pwd === password) return; // 認証OK
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="The Write"' },
  });
}
