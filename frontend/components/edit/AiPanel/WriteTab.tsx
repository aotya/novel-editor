import React from 'react';
import styles from '../edit.module.css';

type WriteTabProps = {
  setIsWriteModalOpen: (isOpen: boolean) => void;
  setIsLongStoryModalOpen: (isOpen: boolean) => void;
  writeChatInput: string;
  setWriteChatInput: (input: string) => void;
};

export const WriteTab = ({
  setIsWriteModalOpen,
  setIsLongStoryModalOpen,
}: WriteTabProps) => {
  return (
    <div className={styles.aiWriteContainer}>
      {/* 短編生成カード */}
      <div className={styles.assistantCard}>
        <div className={styles.assistantHeader}>
          <span className={`material-symbols-outlined ${styles.assistantIcon}`}>auto_fix</span>
          <span className={styles.assistantTitle}>短編生成</span>
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

      {/* 長編生成カード */}
      <div className={styles.assistantCard}>
        <div className={styles.assistantHeader}>
          <span className={`material-symbols-outlined ${styles.assistantIcon}`}>auto_stories</span>
          <span className={styles.assistantTitle}>長編生成</span>
        </div>
        <p className={styles.assistantSubtitle}>
          投稿済みの話を参照し、続きのエピソードを生成します。
        </p>
        <button 
          className={styles.generateNovelsButton}
         
          onClick={() => setIsLongStoryModalOpen(true)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>auto_stories</span>
          続きを生成する
        </button>
      </div>
    </div>
  );
};
