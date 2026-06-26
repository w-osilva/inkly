import { createServer } from 'node:http';

const PORT = 5199;
const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let userText = '';
      try {
        const parsed = JSON.parse(body);
        userText = parsed.messages?.find((m) => m.role === 'user')?.content ?? '';
      } catch { /* ignore */ }
      const reply = { choices: [{ message: { role: 'assistant', content: `REWRITTEN: ${userText}` } }] };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reply));
    });
    return;
  }
  res.writeHead(404);
  res.end();
});
server.listen(PORT, () => console.log(`[mock-llm] listening on ${PORT}`));
