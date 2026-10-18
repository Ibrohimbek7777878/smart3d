/* TZ-16: brauzer testlari uchun soxta Telegram Bot API (haqiqiy botga hech narsa ketmaydi).
 * Har so'rov yoziladi: metod, chat_id, fayl nomi, matn. GET /__kelgan — yozuvlar (test o'qiydi).
 * Ishlatish: node tests/ui/tg_soxta.mjs <port>   (web_server.sh ishga tushiradi va PID bo'yicha to'xtatadi) */
import http from 'node:http';

const kelgan = [];
http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/__kelgan') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(kelgan)); return; }
  const ch = [];
  req.on('data', d => ch.push(d));
  req.on('end', () => {
    const b = Buffer.concat(ch).toString('latin1');
    const metod = (/\/bot[^/]+\/(\w+)$/.exec(req.url) || [])[1] || '?';
    const chat = (/name="chat_id"\r\n\r\n(\d+)/.exec(b) || /"chat_id":(\d+)/.exec(b) || [])[1] || '';
    const nom = (/filename="([^"]+)"/.exec(b) || [])[1] || '';
    kelgan.push({ metod, chat_id: chat, nom: nom ? Buffer.from(nom, 'latin1').toString('utf8') : '', hajm: b.length });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true, result: {} }));
  });
}).listen(+process.argv[2], '127.0.0.1');
