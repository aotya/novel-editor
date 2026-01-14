import React from 'react';
import styles from '../edit.module.css';

type WriteTabProps = {
  setIsWriteModalOpen: (isOpen: boolean) => void;
  writeChatInput: string;
  setWriteChatInput: (input: string) => void;
};

export const WriteTab = ({
  setIsWriteModalOpen,
  writeChatInput,
  setWriteChatInput,
}: WriteTabProps) => {
  return (
    <div className={styles.aiWriteContainer}>
      <div className={styles.assistantCard}>
        <div className={styles.assistantHeader}>
          <span className={`material-symbols-outlined ${styles.assistantIcon}`}>auto_fix</span>
          <span className={styles.assistantTitle}>AI執筆アシスタント</span>
        </div>
        <p className={styles.assistantSubtitle}>
          設定資料やプロットを読み込み、短編小説を自動生成します。
        </p>
        <button 
          className={styles.generateNovelsButton}
          onClick={() => setIsWriteModalOpen(true)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
          短編小説を生成する
        </button>
      </div>

      <div>
        <div className={styles.chatSectionTitle}>AIとの壁打ちチャット</div>
        <div className={styles.chatContainer}>
          <div className={styles.chatBubble}>
            こんにちは。短編のアイデア出しですか？それとも執筆を開始しますか？
          </div>
        </div>
      </div>

      <div className={styles.chatInputContainer}>
        <textarea 
          className={styles.chatTextarea}
          placeholder="AIに指示を出す..."
          value={writeChatInput}
          onChange={(e) => setWriteChatInput(e.target.value)}
        />
        <button className={styles.chatSendButton}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>play_arrow</span>
        </button>
      </div>
    </div>
  );
};
