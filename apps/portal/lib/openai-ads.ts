const PIXEL_ID = 'A79Jb1TcSMGyzyezmsPyo2';

export const OPENAI_ADS_PIXEL_SCRIPT = `!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:"${PIXEL_ID}"});`;

/** Browser pixel plus the server conversion. Registration still succeeds if either call fails. */
export function reportRegistrationCompleted() {
  const pixel = window as Window & { oaiq?: (...args: unknown[]) => void };
  pixel.oaiq?.('measure', 'registration_completed', { type: 'customer_action' });
  void fetch('/api/ads/registration-completed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ sourceUrl: window.location.href }),
  }).catch(() => undefined);
}
