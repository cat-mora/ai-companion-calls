const fs = require('fs');
const path = require('path');

let knowledgeCache = null;

function loadKnowledge() {
  if (knowledgeCache) return knowledgeCache;
  const dir = path.join(process.cwd(), 'api', 'knowledge');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
  knowledgeCache = files
    .map(f => '# SOURCE FILE: ' + f + '\n\n' + fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n\n=====\n\n');
  return knowledgeCache;
}

const BASE_INSTRUCTIONS = `[Advisory methodology and answer-format instructions redacted.
The original defines the adviser's role, the client context, and the required
shape of a SHORT answer versus a DETAIL answer, plus house style rules.]`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const expected = process.env.APP_PASSCODE;
  if (!expected) return res.status(500).json({ error: 'APP_PASSCODE not configured on the server' });
  if ((req.headers['x-passcode'] || '') !== expected) return res.status(401).json({ error: 'Unauthorised' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on the server' });

  const { question, mode, history } = req.body || {};
  if (!question || typeof question !== 'string' || question.length > 4000) {
    return res.status(400).json({ error: 'Missing or invalid question' });
  }

  const detail = mode === 'detail';
  const messages = [];
  if (Array.isArray(history)) {
    for (const m of history.slice(-6)) {
      if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
        messages.push({ role: m.role, content: m.content.slice(0, 4000) });
      }
    }
  }
  messages.push({ role: 'user', content: (detail ? '[DETAIL mode] ' : '[SHORT mode] ') + question });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: detail ? 'claude-sonnet-5' : 'claude-haiku-4-5-20251001',
        max_tokens: detail ? 1200 : 500,
        system: [
          { type: 'text', text: BASE_INSTRUCTIONS },
          { type: 'text', text: 'PLAYBOOK KNOWLEDGE:\n\n' + loadKnowledge(), cache_control: { type: 'ephemeral' } }
        ],
        messages
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: (data.error && data.error.message) || 'Upstream error' });
    }
    const answer = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    return res.status(200).json({ answer });
  } catch (e) {
    return res.status(500).json({ error: 'Request failed: ' + e.message });
  }
};
