import React from 'react';
import styles from '../edit.module.css';

type EditReferences = {
  useCharacters: boolean;
  usePlot: boolean;
  useRelationships: boolean;
  useWorldElements: boolean;
  usePastContent: boolean;
};

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
  editReferences: EditReferences;
  setEditReferences: (refs: EditReferences) => void;
  publishedChaptersCount: number;
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
  editReferences,
  setEditReferences,
  publishedChaptersCount,
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

        {editTargetRange === 'all' && (
          <div>
            <div className={styles.sectionLabel}>参照データ</div>
            <div className={styles.editRefToggles}>
              {[
                { key: 'useCharacters' as const, label: 'キャラクター', icon: 'person' },
                { key: 'usePlot' as const, label: 'プロット', icon: 'description' },
                { key: 'useRelationships' as const, label: '相関図', icon: 'account_tree' },
                { key: 'useWorldElements' as const, label: '世界観', icon: 'public' },
                { key: 'usePastContent' as const, label: `過去話 (${publishedChaptersCount})`, icon: 'history' },
              ].map(item => (
                <label key={item.key} className={styles.editRefToggleItem}>
                  <input
                    type="checkbox"
                    checked={editReferences[item.key]}
                    onChange={(e) => setEditReferences({ ...editReferences, [item.key]: e.target.checked })}
                  />
                  <span className={`material-symbols-outlined ${styles.editRefToggleIcon}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className={styles.sectionLabel}>指示内容</div>
          <textarea 
            className={styles.instructionTextarea}
            placeholder={editTargetRange === 'all' 
              ? "例：描写を肉付けして、情景描写や心理描写を充実させて..." 
              : "例：○○という設定を踏まえて書き直して..."}
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
          {editTargetRange === 'all' ? '肉付けを実行する' : '修正案を作成する'}
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
