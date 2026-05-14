const https = require('https');
require('dotenv').config({ path: '../.env' });

async function callOpenRouter(prompt, systemPrompt = '') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return {
      success: false,
      error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in .env file.',
      model: model,
      usage: null,
      response: null
    };
  }

  const requestBody = JSON.stringify({
    model: model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt }
    ],
    max_tokens: 4000,
    temperature: 0.3
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:4001',
        'X-Title': 'AI Audit Workpaper Automation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({
              success: false,
              error: parsed.error.message || 'OpenRouter API error',
              model: model,
              usage: null,
              response: null
            });
          } else {
            resolve({
              success: true,
              error: null,
              model: parsed.model || model,
              usage: parsed.usage || null,
              response: parsed.choices?.[0]?.message?.content || '',
              id: parsed.id,
              created: parsed.created
            });
          }
        } catch (e) {
          resolve({
            success: false,
            error: 'Failed to parse API response',
            model: model,
            usage: null,
            response: null
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        success: false,
        error: e.message,
        model: model,
        usage: null,
        response: null
      });
    });

    req.write(requestBody);
    req.end();
  });
}

// ── Streaming version: pipes SSE chunks to an Express response ────────────
function streamOpenRouter(prompt, systemPrompt = '', res) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    res.write(`data: ${JSON.stringify({ error: 'OpenRouter API key not configured.' })}\n\n`);
    res.end();
    return;
  }

  const requestBody = JSON.stringify({
    model: model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    stream: true
  });

  const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:4001',
      'X-Title': 'AI Audit Workpaper Automation'
    }
  };

  const req = https.request(options, (apiRes) => {
    let buffer = '';
    apiRes.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') {
          if (trimmed === 'data: [DONE]') {
            res.write('data: [DONE]\n\n');
          }
          continue;
        }
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              res.write(`data: ${JSON.stringify({ delta, model: json.model || model })}\n\n`);
            }
          } catch (e) {
            // skip malformed chunks
          }
        }
      }
    });

    apiRes.on('end', () => {
      // flush remaining buffer
      if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
        try {
          const json = JSON.parse(buffer.trim().slice(6));
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) res.write(`data: ${JSON.stringify({ delta, model: json.model || model })}\n\n`);
        } catch (e) { /* ignore */ }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    });
  });

  req.on('error', (e) => {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.end();
  });

  req.write(requestBody);
  req.end();
}

/**
 * 3-strategy JSON parser for AI responses:
 *  1) parse the raw response directly
 *  2) strip ```json fences and parse the inner block
 *  3) regex-extract the first {...} or [...] block and parse that
 */
function parseAIJson(content) {
  if (!content || typeof content !== 'string') {
    return { ok: false, raw: content };
  }
  // Strategy 1: direct
  try { return { ok: true, data: JSON.parse(content) }; } catch (_) {}
  // Strategy 2: strip code fences
  const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch && fenceMatch[1]) {
    try { return { ok: true, data: JSON.parse(fenceMatch[1].trim()) }; } catch (_) {}
  }
  // Strategy 3: regex-extract first JSON object/array block
  const blockMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (blockMatch && blockMatch[1]) {
    try { return { ok: true, data: JSON.parse(blockMatch[1]) }; } catch (_) {}
  }
  return { ok: false, raw: content };
}

module.exports = { callOpenRouter, streamOpenRouter, parseAIJson };
