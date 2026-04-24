const https = require('https');
require('dotenv').config({ path: '../.env' });

async function callOpenRouter(prompt, systemPrompt = '') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

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

module.exports = { callOpenRouter };
