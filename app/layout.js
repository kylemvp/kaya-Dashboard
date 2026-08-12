import './globals.css'

export const metadata = {
  title: 'Kaya CMS — Content Dashboard',
  description: 'Manage treatments, doctors, enquiries and page content for the Kaya site.',
  // A staff tool has no business appearing in search results.
  robots: { index: false, follow: false },
}

/**
 * Plain-JS diagnostic, inlined into the static HTML.
 *
 * The React error boundary can only report a crash once React is running. When
 * the failure is earlier than that — a chunk blocked by an extension, a script
 * that never parses, a browser mid-update serving stale resources — nothing
 * mounts and the visitor is left with a white page and no information.
 *
 * This runs before and independently of the app: it records errors as they
 * happen, then after a grace period checks whether anything actually rendered.
 * If not, it prints what it saw, so the problem can be read off the screen
 * instead of requiring devtools.
 */
const DIAGNOSTIC = `
(function () {
  var errors = [];
  var failed = [];

  window.addEventListener('error', function (e) {
    // Resource failures (script/style/image) arrive with a target, not a message.
    if (e.target && e.target !== window && (e.target.src || e.target.href)) {
      failed.push(String(e.target.src || e.target.href));
      return;
    }
    var where = e.filename ? ' (' + String(e.filename).split('/').pop() + ':' + e.lineno + ')' : '';
    errors.push(String(e.message || 'Unknown error') + where);
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    errors.push('Unhandled promise: ' + String((r && (r.message || r.stack)) || r));
  });

  function esc(s) {
    return String(s).replace(/[<>&]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c];
    });
  }

  setTimeout(function () {
    // The app mounted — nothing to report.
    if (document.querySelector('.ad-login, .ad-shell, .ad-crash')) return;

    var rows = [
      ['Browser', navigator.userAgent],
      ['Page', location.href],
      ['Scripts that failed to load', failed.length ? failed.join('\\n') : 'none'],
      ['Errors', errors.length ? errors.join('\\n') : 'none recorded'],
    ];

    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;' +
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F6F4FB;color:#241C36">' +
      '<div style="width:100%;max-width:680px;background:#fff;border:1px solid #EAE4F5;border-radius:18px;' +
      'padding:32px;box-shadow:0 24px 60px rgba(90,70,140,.14)">' +
      '<h1 style="margin:0 0 6px;font-size:20px;font-weight:700">The dashboard did not start</h1>' +
      '<p style="margin:0 0 20px;font-size:13.5px;line-height:1.6;color:#665F7A">' +
      'The page loaded but nothing rendered. The details below say why — please send a screenshot of this.</p>' +
      rows.map(function (r) {
        return '<div style="margin-bottom:14px">' +
          '<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#665F7A;' +
          'margin-bottom:5px">' + esc(r[0]) + '</div>' +
          '<pre style="margin:0;padding:10px 12px;background:#FAF9FC;border:1px solid #EAE4F5;border-radius:8px;' +
          'font-size:11px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:#B23B3B">' +
          esc(r[1]) + '</pre></div>';
      }).join('') +
      '<button onclick="try{Object.keys(localStorage).filter(function(k){return k.indexOf(\\'kaya_admin_\\')===0})' +
      '.forEach(function(k){localStorage.removeItem(k)})}catch(e){};location.reload()" ' +
      'style="margin-top:6px;background:#6E5A96;color:#fff;border:0;border-radius:9px;padding:11px 18px;' +
      'font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Clear saved data &amp; reload</button>' +
      '</div></div>';
  }, 6000);
})();
`

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
        Browser extensions commonly stamp attributes onto <body> before React
        hydrates (password managers, grammar checkers, screen recorders), which
        React reports as a hydration mismatch even though the app rendered
        identically on both sides.

        suppressHydrationWarning applies to THIS element only — its own
        attributes and text. Mismatches inside the tree still surface, so this
        silences the extension noise without hiding a real bug.
      */}
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: DIAGNOSTIC }} />
        {children}
      </body>
    </html>
  )
}
