import React from 'react';

function AIResponse({ result, loading, onClose }) {
  if (loading) {
    return (
      <div className="ai-response-container">
        <div className="ai-response-header">
          <div className="ai-icon"><i className="fa-solid fa-robot"></i></div>
          <span className="ai-title">AI Analysis</span>
        </div>
        <div className="ai-loading">
          <div className="spinner"></div>
          Analyzing with AI... Please wait
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (!result.success) {
    return (
      <div className="ai-response-container">
        <div className="ai-response-header">
          <div className="ai-icon"><i className="fa-solid fa-robot"></i></div>
          <span className="ai-title">AI Analysis</span>
          {onClose && <button className="modal-close" onClick={onClose} style={{ marginLeft: 'auto' }}>&times;</button>}
        </div>
        <div className="ai-response-body">
          <div className="ai-error">
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }}></i>
            {result.error}
          </div>
        </div>
      </div>
    );
  }

  // Parse markdown-like content into styled HTML
  const formatContent = (text) => {
    if (!text) return '';

    // Split into lines and process
    const lines = text.split('\n');
    let html = '';
    let inList = false;

    lines.forEach(line => {
      const trimmed = line.trim();

      if (trimmed.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3 style="color:#c4b5fd;font-size:15px;font-weight:700;margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid rgba(139,92,246,0.2)">${trimmed.slice(4)}</h3>`;
      } else if (trimmed.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h2 style="color:#a78bfa;font-size:17px;font-weight:700;margin:24px 0 10px;padding-bottom:8px;border-bottom:1px solid rgba(139,92,246,0.3)">${trimmed.slice(3)}</h2>`;
      } else if (trimmed.startsWith('# ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h1 style="color:#8b5cf6;font-size:19px;font-weight:800;margin:24px 0 12px">${trimmed.slice(2)}</h1>`;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) { html += '<ul style="margin:8px 0;padding-left:20px">'; inList = true; }
        html += `<li style="margin:6px 0;color:#cbd5e1;line-height:1.6">${formatInline(trimmed.slice(2))}</li>`;
      } else if (/^\d+\.\s/.test(trimmed)) {
        if (inList) { html += '</ul>'; inList = false; }
        const content = trimmed.replace(/^\d+\.\s/, '');
        html += `<div style="display:flex;gap:10px;margin:8px 0;align-items:flex-start">
          <span style="color:#8b5cf6;font-weight:700;min-width:24px">${trimmed.match(/^\d+/)[0]}.</span>
          <span style="color:#cbd5e1;line-height:1.6">${formatInline(content)}</span>
        </div>`;
      } else if (trimmed === '') {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<div style="height:8px"></div>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p style="color:#cbd5e1;line-height:1.7;margin:4px 0">${formatInline(trimmed)}</p>`;
      }
    });

    if (inList) html += '</ul>';
    return html;
  };

  const formatInline = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0;font-weight:600">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color:#94a3b8">$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(139,92,246,0.15);color:#c4b5fd;padding:2px 6px;border-radius:4px;font-size:13px">$1</code>');
  };

  return (
    <div className="ai-response-container">
      <div className="ai-response-header">
        <div className="ai-icon"><i className="fa-solid fa-robot"></i></div>
        <span className="ai-title">AI Analysis Results</span>
        <span className="ai-model">{result.model}</span>
        {onClose && <button className="modal-close" onClick={onClose} style={{ marginLeft: 12 }}>&times;</button>}
      </div>
      <div className="ai-response-body">
        <div
          className="ai-content"
          dangerouslySetInnerHTML={{ __html: formatContent(result.response) }}
          style={{ whiteSpace: 'normal' }}
        />
      </div>
      {result.usage && (
        <div className="ai-response-footer">
          <div className="usage-stat">
            <i className="fa-solid fa-arrow-up" style={{ fontSize: 10 }}></i>
            {result.usage.prompt_tokens} prompt tokens
          </div>
          <div className="usage-stat">
            <i className="fa-solid fa-arrow-down" style={{ fontSize: 10 }}></i>
            {result.usage.completion_tokens} completion tokens
          </div>
          <div className="usage-stat">
            <i className="fa-solid fa-sigma" style={{ fontSize: 10 }}></i>
            {result.usage.total_tokens} total
          </div>
        </div>
      )}
    </div>
  );
}

export default AIResponse;
