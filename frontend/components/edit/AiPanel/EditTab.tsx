import React from 'react';
import styles from '../edit.module.css';

type EditTabProps = {
  isEditLoading: boolean;
  editResult: { original: string; suggestion: string; reason: string } | null;
  setEditResult: (result: any) => void;
  editTargetRange: 'selection' | 'all';
  setEditTargetRange: (range: 'selection' | 'all') => void;
  selectionLength: number;
  editInstruction: string;
  setEditInstruction: (instruction: string) => void;
  handleEditQuickInstruction: (text: string) => void;
  handleGenerateEditSuggestion: () => Promise<void>;
  handleApplyEdit: () => void;
};

export const EditTab = ({
  isEditLoading,
  editResult,
  setEditResult,
  editTargetRange,
  setEditTargetRange,
  selectionLength,
  editInstruction,
  setEditInstruction,
  handleEditQuickInstruction,
  handleGenerateEditSuggestion,
  handleApplyEdit,
}: EditTabProps) => {
  if (isEditLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1rem', color: '#64748b' }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '32px' }}>auto_awesome</span>
        <span>AIが修正案を作成中...</span>
      </div>
    );
  }

  if (!editResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
        <div>
          <div className={styles.sectionLabel}>対象範囲</div>
          <div className={styles.rangeSelector}>
            <div 
              className={`${styles.rangeOption} ${editTargetRange === 'selection' ? styles.rangeOptionActive : ''}`}
              onClick={() => setEditTargetRange('selection')}
            >
              選択範囲 ({selectionLength}文字)
            </div>
            <div 
              className={`${styles.rangeOption} ${editTargetRange === 'all' ? styles.rangeOptionActive : ''}`}
              onClick={() => setEditTargetRange('all')}
            >
              全体
            </div>
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel}>クイック指示</div>
          <div className={styles.quickInstructionGrid}>
            {[
              { label: "表現をリッチに", icon: "auto_awesome", color: "#8b5cf6" },
              { label: "感情を強める", icon: "favorite", color: "#ec4899" },
              { label: "簡潔にする", icon: "short_text", color: "#10b981" },
              { label: "緊迫感を出す", icon: "warning", color: "#f59e0b" }
            ].map(item => (
              <button key={item.label} className={styles.quickInstructionButton} onClick={() => handleEditQuickInstruction(item.label)}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: item.color }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className={styles.sectionLabel}>指示内容</div>
          <textarea 
            className={styles.instructionTextarea}
            placeholder="例：○○という設定を踏まえて書き直して..."
            value={editInstruction}
            onChange={(e) => setEditInstruction(e.target.value)}
          />
        </div>

        <button 
          className={`${styles.generateButton} ${(!editInstruction || (editTargetRange === 'selection' && selectionLength === 0)) ? styles.generateButtonDisabled : ''}`}
          onClick={handleGenerateEditSuggestion}
          disabled={!editInstruction || (editTargetRange === 'selection' && selectionLength === 0)}
        >
          <span className="material-symbols-outlined">auto_fix</span>
          修正案を作成する
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'auto' }}>
      <div className={styles.resultHeader}>
        <button className={styles.backButton} onClick={() => setEditResult(null)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span>生成結果の確認</span>
      </div>

      <div className={styles.editResultCard}>
        <div className={styles.editResultHeader}>
          <span className="material-symbols-outlined">auto_awesome</span>
          AIからの提案
        </div>
        
        <div className={styles.diffSection}>
          <span className={styles.diffLabel}>変更前:</span>
          <div className={`${styles.diffContent} ${styles.diffContentOld}`}>
            {editResult.original.length > 100 ? editResult.original.substring(0, 100) + "..." : editResult.original}
          </div>
        </div>

        <div className={styles.diffSection}>
          <span className={styles.diffLabel}>変更後:</span>
          <div className={`${styles.diffContent} ${styles.diffContentNew}`}>
            {editResult.suggestion}
          </div>
        </div>

        <div className={styles.reasonBox}>
          <div className={styles.reasonHeader}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#fbbf24' }}>lightbulb</span>
            修正の意図
          </div>
          <p className={styles.reasonText}>{editResult.reason}</p>
        </div>
      </div>

      <div className={styles.resultFooter}>
        <button className={styles.regenerateButton} onClick={handleGenerateEditSuggestion}>
          <span className="material-symbols-outlined">refresh</span>
          再生成
        </button>
        <button className={styles.applyButton} onClick={handleApplyEdit}>
          <span className="material-symbols-outlined">check</span>
          採用して反映
        </button>
      </div>
    </div>
  );
};
