import React from 'react';
import styles from '../edit.module.css';

export type Suggestion = {
  id: string;
  type: 'typo' | 'grammar' | 'expression';
  originalText: string;
  suggestedText: string;
  description: string;
  label: string;
};

type ProofreadTabProps = {
  isAiLoading: boolean;
  hasProofreadRun: boolean;
  suggestions: Suggestion[];
  runProofreading: () => Promise<void>;
  handleIgnoreSuggestion: (suggestion: Suggestion) => void;
  handleAcceptSuggestion: (suggestion: Suggestion) => void;
  handleAcceptAllSuggestions: () => void;
};

export const ProofreadTab = ({
  isAiLoading,
  hasProofreadRun,
  suggestions,
  runProofreading,
  handleIgnoreSuggestion,
  handleAcceptSuggestion,
  handleAcceptAllSuggestions,
}: ProofreadTabProps) => {
  if (isAiLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1rem', color: '#64748b' }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '32px' }}>sync</span>
        <span>AIが文章を分析中...</span>
      </div>
    );
  }

  if (!hasProofreadRun) {
    return (
      <div className={styles.emptyStateContainer}>
        <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>find_in_page</span>
        <div>
          <p style={{ fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>AI校正を実行</p>
          <p style={{ fontSize: '0.9rem' }}>誤字脱字や文法ミス、表現の改善点を<br />AIがチェックします。</p>
        </div>
        <button className={styles.startProofreadButton} onClick={runProofreading}>
          <span className="material-symbols-outlined">play_arrow</span>
          校正を開始する
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.summaryBox}>
        <span className={`material-symbols-outlined ${styles.summaryIcon}`}>info</span>
        <div className={styles.summaryContent}>
          <span className={styles.summaryTitle}>{suggestions.length}件の指摘があります</span>
          <span className={styles.summaryDesc}>誤字脱字・文法ミスをチェックしました。</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
        {suggestions.map(suggestion => (
          <div key={suggestion.id} className={styles.suggestionCard}>
            <div className={styles.suggestionHeader}>
              <span className={`${styles.suggestionBadge} ${
                suggestion.type === 'typo' ? styles.badgeTypo : 
                suggestion.type === 'grammar' ? styles.badgeGrammar : 
                styles.badgeExpression
              }`}>
                {suggestion.label}
              </span>
            </div>
            <div className={styles.suggestionContent}>
              <span className={styles.originalText}>{suggestion.originalText}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#cbd5e1' }}>arrow_forward</span>
              <span className={styles.suggestedText}>{suggestion.suggestedText}</span>
            </div>
            <p className={styles.suggestionDescription}>{suggestion.description}</p>
            <div className={styles.suggestionActions}>
              <button className={styles.ignoreButton} onClick={() => handleIgnoreSuggestion(suggestion)}>無視</button>
              <button className={styles.acceptButton} onClick={() => handleAcceptSuggestion(suggestion)}>修正</button>
            </div>
          </div>
        ))}
        {suggestions.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', margin: '0 auto' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '1rem' }}>check_circle</span>
            <p style={{ marginBottom: '30px' }}>修正提案はありません。<br />素晴らしい文章です！</p>
            <button className={styles.startProofreadButton} onClick={runProofreading}>
              <span className="material-symbols-outlined">play_arrow</span>
              再度校正する
            </button>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <button className={styles.fixAllButton} onClick={handleAcceptAllSuggestions}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>done_all</span>
          すべて修正する
        </button>
      )}
    </>
  );
};
