import React from 'react';
import FormattedAIReport from './FormattedAIReport';

export default function AIResponse({ result, loading, onClose }) {
  if (loading) return <div className="ai-response-container" role="status">Analyzing with AI…</div>;
  if (result == null) return null;
  return <div className="ai-response-container">
    {onClose && <button type="button" className="modal-close" onClick={onClose} aria-label="Close analysis">&times;</button>}
    {result.success === false ? <div className="ai-error" role="alert">{result.error || 'Analysis failed.'}</div>
      : <FormattedAIReport response={result} title="AI analysis results" />}
  </div>;
}
