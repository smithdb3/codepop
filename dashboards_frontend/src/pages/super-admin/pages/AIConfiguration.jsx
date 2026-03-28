import React, { useState } from 'react';
import styles from './AIConfiguration.module.css';

export function AIConfiguration() {
  const [expanded, setExpanded] = useState({ rec: true, chat: false, forecast: false });
  const [dirty, setDirty] = useState(false);
  const [config, setConfig] = useState({
    confidenceThreshold: 0.75,
    suggestionFreq: 5,
    personalization: 'medium',
    responseConfidence: 0.8,
    escalationLevel: 0.6,
    maxRetry: 3,
    updateFreq: 'daily',
    predictionThreshold: 0.85,
    autoRestock: false,
  });

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const togglePanel = (panel) => {
    setExpanded((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>Dashboard {'>'} AI Configuration</div>
        <h1 className={styles.title}>AI Configuration</h1>
      </div>

      {/* Recommendation Engine */}
      <div className={styles.panel}>
        <button
          className={styles.panelHeader}
          onClick={() => togglePanel('rec')}
        >
          <span className={styles.panelTitle}>Recommendation Engine</span>
          <span className={styles.panelIcon}>{expanded.rec ? '▼' : '▶'}</span>
        </button>
        {expanded.rec && (
          <div className={styles.panelContent}>
            <div className={styles.control}>
              <label>Confidence Threshold: {(config.confidenceThreshold * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={config.confidenceThreshold}
                onChange={(e) => handleChange('confidenceThreshold', parseFloat(e.target.value))}
              />
            </div>
            <div className={styles.control}>
              <label>Suggestion Frequency: {config.suggestionFreq} per day</label>
              <input
                type="range"
                min="1"
                max="10"
                value={config.suggestionFreq}
                onChange={(e) => handleChange('suggestionFreq', parseInt(e.target.value))}
              />
            </div>
            <div className={styles.control}>
              <label>Personalization Level</label>
              <div className={styles.radioGroup}>
                {['low', 'medium', 'high'].map((level) => (
                  <label key={level} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="personalization"
                      value={level}
                      checked={config.personalization === level}
                      onChange={(e) => handleChange('personalization', e.target.value)}
                    />
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chatbot Settings */}
      <div className={styles.panel}>
        <button
          className={styles.panelHeader}
          onClick={() => togglePanel('chat')}
        >
          <span className={styles.panelTitle}>Chatbot Settings</span>
          <span className={styles.panelIcon}>{expanded.chat ? '▼' : '▶'}</span>
        </button>
        {expanded.chat && (
          <div className={styles.panelContent}>
            <div className={styles.control}>
              <label>Response Confidence Min: {(config.responseConfidence * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.responseConfidence}
                onChange={(e) => handleChange('responseConfidence', parseFloat(e.target.value))}
              />
            </div>
            <div className={styles.control}>
              <label>Enable Escalation at: {(config.escalationLevel * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.escalationLevel}
                onChange={(e) => handleChange('escalationLevel', parseFloat(e.target.value))}
              />
            </div>
            <div className={styles.control}>
              <label>Max Retry Attempts</label>
              <input
                type="number"
                value={config.maxRetry}
                onChange={(e) => handleChange('maxRetry', parseInt(e.target.value))}
                min="1"
                max="10"
              />
            </div>
          </div>
        )}
      </div>

      {/* Forecasting Engine */}
      <div className={styles.panel}>
        <button
          className={styles.panelHeader}
          onClick={() => togglePanel('forecast')}
        >
          <span className={styles.panelTitle}>Forecasting Engine</span>
          <span className={styles.panelIcon}>{expanded.forecast ? '▼' : '▶'}</span>
        </button>
        {expanded.forecast && (
          <div className={styles.panelContent}>
            <div className={styles.control}>
              <label>Update Frequency</label>
              <div className={styles.radioGroup}>
                {['hourly', '6-hourly', 'daily'].map((freq) => (
                  <label key={freq} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="updateFreq"
                      value={freq}
                      checked={config.updateFreq === freq}
                      onChange={(e) => handleChange('updateFreq', e.target.value)}
                    />
                    {freq === 'hourly' ? 'Every Hour' : freq === '6-hourly' ? 'Every 6 Hours' : 'Daily'}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.control}>
              <label>Prediction Accuracy Threshold: {(config.predictionThreshold * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.predictionThreshold}
                onChange={(e) => handleChange('predictionThreshold', parseFloat(e.target.value))}
              />
            </div>
            <div className={styles.control}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={config.autoRestock}
                  onChange={(e) => handleChange('autoRestock', e.target.checked)}
                />
                Enable Auto-Restock
              </label>
            </div>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.resetBtn}>Reset to Defaults</button>
        <button className={`${styles.saveBtn} ${!dirty ? styles.disabled : ''}`} disabled={!dirty}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
