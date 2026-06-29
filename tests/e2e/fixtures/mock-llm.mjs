import { createServer } from 'node:http';

const PORT = 5199;
const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let userText = '';
      let systemText = '';
      let stream = false;
      try {
        const parsed = JSON.parse(body);
        userText = parsed.messages?.find((m) => m.role === 'user')?.content ?? '';
        systemText = parsed.messages?.find((m) => m.role === 'system')?.content ?? '';
        stream = parsed.stream === true;
      } catch { /* ignore */ }
      const toneMatch = systemText.match(/use a (\w+) tone/i);
      const tag = toneMatch ? `[${toneMatch[1].toLowerCase()}]` : '';
      const translateMatch = systemText.match(/translate the user'?s text into (\w+)/i);
      const isSynonyms = /thesaurus|synonyms/i.test(systemText);
      const isImprove = /careful (writing assistant|proofreader)|JSON array of objects/i.test(systemText);
      const isAnalyze = /writing coach/i.test(systemText);
      const isDefine = /concise dictionary|define the user/i.test(systemText);
      let content;
      if (translateMatch) {
        content = `TRANSLATED[${translateMatch[1].toLowerCase()}]: ${userText}`;
      } else if (isDefine) {
        content = `DEFINITION: ${userText}`;
      } else if (isSynonyms) {
        content = JSON.stringify([
          { sense: 'first sense', synonyms: ['alpha', 'beta'] },
          { sense: 'second sense', synonyms: ['gamma'] },
        ]);
      } else if (isImprove) {
        // Return one applicable edit whose "original" is an exact substring of the input.
        if (userText.includes('teh')) content = JSON.stringify([{ original: 'teh', improved: 'the', reason: 'spelling' }]);
        else content = JSON.stringify([{ original: userText, improved: `IMPROVED: ${userText}`, reason: 'clarity' }]);
      } else if (isAnalyze) {
        content = `ANALYSIS: ${userText} looks fine.`;
      } else {
        content = `REWRITTEN${tag}: ${userText}`;
      }
      if (stream) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        const mid = Math.ceil(content.length / 2);
        const parts = [content.slice(0, mid), content.slice(mid)].filter((p) => p.length > 0);
        for (const p of parts) {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
        return;
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
