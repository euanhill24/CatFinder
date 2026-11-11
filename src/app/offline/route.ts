/**
 * The page shown when the app is opened with no connection (R-91). The service
 * worker stores it on first visit. It is one self-contained document because
 * nothing else can be fetched when it is needed.
 */
const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#fdf6ee">
<title>Kitty Tinder</title>
<style>
  html, body { height: 100%; margin: 0; }
  body { display: flex; flex-direction: column; align-items: center; justify-content: center;
         background: #fdf6ee; color: #2d1b12; font-family: ui-rounded, "Nunito", system-ui, sans-serif;
         text-align: center; padding: 0 24px; }
  .paw { font-size: 72px; line-height: 1; }
  h1 { font-family: "Fraunces", Georgia, serif; font-size: 22px; margin: 16px 0 8px; }
  p { color: #9b7a6e; font-size: 14px; max-width: 260px; margin: 0; }
  button { margin-top: 20px; min-height: 48px; padding: 0 24px; border: 0; border-radius: 999px;
           background: #e85d75; color: #fff; font: inherit; font-weight: 700; font-size: 15px; }
</style>
</head>
<body>
  <div class="paw" aria-hidden="true">📡</div>
  <h1>You're offline</h1>
  <p>The cats need a connection. Find some signal and try again.</p>
  <button onclick="location.reload()">Try again</button>
</body>
</html>`;

export function GET() {
  return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
}
