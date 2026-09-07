const $ = id => document.getElementById(id);
let secret = '', socket, poll, countdown, renew, expiresAt = 0, generation = 0;
const stop = () => { generation++; clearTimeout(poll); clearTimeout(renew); clearInterval(countdown); if (socket) { socket.onclose = null; socket.close(); } socket = undefined; hideQr('Display disconnected'); secret = ''; };
function hideQr(message) { $('qr').hidden = true; $('qr').removeAttribute('src'); $('qr-message').hidden = false; $('qr-message').textContent = message; }
function end(message) { stop(); $('live').hidden = true; $('pairing').hidden = false; $('pairing-code').textContent = 'Disconnected'; $('pairing-status').textContent = message; $('new-code').hidden = false; }
async function request(path, options = {}) {
  const response = await fetch('/api/v1/display' + path, { cache: 'no-store', ...options });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.message || 'The display could not connect.'); error.status = response.status; throw error; }
  return data;
}
async function start() {
  stop(); const own = generation;
  $('live').hidden = true; $('pairing').hidden = false; $('new-code').hidden = true; $('pairing-code').textContent = 'Connecting...';
  try {
    const data = await request('/pairing', { method: 'POST' });
    if (own !== generation) return;
    secret = data.deviceSecret; $('pairing-code').textContent = data.code.slice(0, 4) + ' ' + data.code.slice(4); $('pairing-status').textContent = 'Code expires in 5 minutes. Waiting for your faculty app...';
    pollState(own);
  } catch (error) { if (own === generation) end(error.message); }
}
async function pollState(own) {
  if (own !== generation) return;
  try {
    const data = await request('/state', { headers: { Authorization: 'Bearer ' + secret } });
    if (own !== generation) return;
    if (data.status === 'WAITING') { poll = setTimeout(() => pollState(own), 2000); return; }
    $('pairing').hidden = true; $('live').hidden = false; $('class-title').textContent = data.title; $('classroom').textContent = data.classroom;
    connect(data, own);
  } catch (error) {
    if (own !== generation) return;
    if (error.status === 410 || error.status === 401) end(error.message);
    else { hideQr('Connection lost. Reconnecting...'); $('live-status').textContent = 'Checking the server connection...'; $('pairing-status').textContent = 'Connection lost. Retrying...'; poll = setTimeout(() => pollState(own), 3000); }
  }
}
function connect(data, own) {
  if (socket) { socket.onclose = null; socket.close(); }
  clearTimeout(renew); clearInterval(countdown);
  socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  socket.onopen = () => socket.send(JSON.stringify({ type: 'SUBSCRIBE_DISPLAY', token: data.displayToken }));
  socket.onmessage = event => {
    if (own !== generation) return;
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'QR_ROTATION') { expiresAt = message.expiresAt * 1000; $('qr').src = message.qrDataUrl; $('qr').hidden = false; $('qr-message').hidden = true; tick(); }
      if (message.type === 'ERROR') end(message.message || 'The display session ended.');
    } catch { hideQr('Waiting for a fresh QR...'); }
  };
  socket.onerror = () => hideQr('Connection lost. Reconnecting...');
  socket.onclose = () => { if (own === generation) { hideQr('Connection lost. Reconnecting...'); poll = setTimeout(() => pollState(own), 2000); } };
  countdown = setInterval(tick, 500);
  // Refresh the narrow display credential before its five-minute expiry.
  renew = setTimeout(() => pollState(own), 240000);
}
function tick() { const remaining = Math.ceil((expiresAt - Date.now()) / 1000); if (remaining <= 0) { hideQr('Waiting for a fresh QR...'); $('live-status').textContent = 'Refreshing the code'; } else $('live-status').textContent = 'Live · Refreshes in ' + remaining + 's'; }
$('new-code').onclick = start;
$('disconnect').onclick = async () => { try { await request('/state', { method: 'DELETE', headers: { Authorization: 'Bearer ' + secret } }); } finally { end('Screen disconnected. Get a new code to pair again.'); } };
$('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { $('fullscreen').textContent = 'Use your browser’s full-screen option'; } };
window.addEventListener('pagehide', stop);
start();
