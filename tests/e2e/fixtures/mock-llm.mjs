import { createServer } from 'node:http';

const PORT = 5199;
const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let userText = '';
      let systemText = '';
      try {
        const parsed = JSON.parse(body);
        userText = parsed.messages?.find((m) => m.role === 'user')?.content ?? '';
        systemText = parsed.messages?.find((m) => m.role === 'system')?.content ?? '';
      } catch { /* ignore */ }
      const toneMatch = systemText.match(/use a (\w+) tone/i);
      const tag = toneMatch ? `[${toneMatch[1].toLowerCase()}]` : '';
      const translateMatch = systemText.match(/translate the user'?s text into (\w+)/i);
      let content;
      if (translateMatch) {
        content = `TRANSLATED[${translateMatch[1].toLowerCase()}]: ${userText}`;
      } else {
        content = `REWRITTEN${tag}: ${userText}`;
      }
      const reply = { choices: [{ message: { role: 'assistant', content } }] };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reply));
    });
    return;
  }
  res.writeHead(404);
  res.end();
});
server.listen(PORT, () => console.log(`[mock-llm] listening on ${PORT}`));
