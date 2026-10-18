/* WebSocket — real-time narx (/ws). X6: begona sayt ulana olmaydi (Origin), IP bo'yicha 5 ulanish; kiruvchi xabarlardan faqat ping.
 * Proksi (nginx) ortida haqiqiy IP — X-Forwarded-For; u yo'q bo'lsa IP noma'lum (hamma 127.0.0.1 bo'lib qolmasin) — chegara qo'llanmaydi. */
import { WebSocketServer } from 'ws';
import { wsGuard } from '../himoya.js';

/** → { broadcastPrice(materialId, uzs, usd) } */
export function narxEfiri({ server, app, allowed }) {
  const wsg = wsGuard({ allowed, maxPerIp: 5, ipOf: (req) => app.get('trust proxy') ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : req.socket.remoteAddress });
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096, verifyClient: wsg.verifyClient });

  wss.on('connection', (ws, req) => {
    wsg.track(ws, req);
    ws.on('error', () => {});
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch (e) { /* ignore */ }
    });
    ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));
  });

  function broadcastPrice(materialId, uzs, usd) {
    const msg = JSON.stringify({ type: 'price_update', material_id: materialId, uzs, usd, ts: Date.now() });
    wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
  }
  return { broadcastPrice };
}
