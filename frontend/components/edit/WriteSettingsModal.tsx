import React from 'react';
import styles from './edit.module.css';

type WriteSettings = {
  instructions: string;
  useCharacters: boolean;
  usePlot: boolean;
  useRelationships: boolean;
  useExistingContent: boolean;
  wordCount: string;
  pov: string;
};

type Novel = {
  id: string;
  title: string;
  synopsis?: string;
};

type WriteSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  novel: Novel;
  writeSettings: WriteSettings;
  setWriteSettings: (settings: WriteSettings) => void;
  isGeneratingStory: boolean;
  onExecute: () => Promise<void>;
};

export const WriteSettingsModal = ({
  isOpen,
  onClose,
  novel,
  writeSettings,
  setWriteSettings,
  isGeneratingStory,
  onExecute,
}: WriteSettingsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleWrapper}>
            <span className={`material-symbols-outlined ${styles.modalHeaderIcon}`}>auto_fix</span>
            <span className={styles.modalTitle}>短編生成の設定</span>
          </div>
          <button className={styles.modalCloseButton} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>タイトル</label>
            <div className={styles.staticText}>
              {novel?.title || "未設定"}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>あらすじ</label>
            <div className={styles.staticTextarea}>
              {novel?.synopsis || "未設定"}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>追加の指示</label>
            <textarea 
              className={styles.formTextarea} 
              placeholder="例：今回はアクションシーンを多めに、緊迫感のある描写を意識して書いてください。"
              value={writeSettings.instructions}
              onChange={(e) => setWriteSettings({...writeSettings, instructions: e.target.value})}
            />
          </div>

          <div className={styles.settingsSection}>
            <div className={styles.settingsSectionTitle}>参照データの設定</div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingItemLeft}>
                <div className={styles.settingItemIcon}>
                  <span className="material-symbols-outlined">person</span>
                </div>
                <span className={styles.settingItemLabel}>キャラクター設定の読み取り</span>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={writeSettings.useCharacters}
                  onChange={(e) => setWriteSettings({...writeSettings, useCharacters: e.target.checked})}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingItemLeft}>
                <div className={`${styles.settingItemIcon} ${styles.settingItemIconPurple}`}>
                  <span className="material-symbols-outlined">description</span>
                </div>
                <span className={styles.settingItemLabel}>プロットの読み取り</span>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={writeSettings.usePlot}
                  onChange={(e) => setWriteSettings({...writeSettings, usePlot: e.target.checked})}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingItemLeft}>
                <div className={`${styles.settingItemIcon} ${styles.settingItemIconGray}`}>
                  <span className="material-symbols-outlined">account_tree</span>
                </div>
                <span className={styles.settingItemLabel}>相関図（関係性）の読み取り</span>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={writeSettings.useRelationships}
                  onChange={(e) => setWriteSettings({...writeSettings, useRelationships: e.target.checked})}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingItemLeft}>
                <div className={`${styles.settingItemIcon} ${styles.settingItemIconPurple}`}>
                  <span className="material-symbols-outlined">history_edu</span>
                </div>
                <span className={styles.settingItemLabel}>現在の内容をベースにする</span>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={writeSettings.useExistingContent}
                  onChange={(e) => setWriteSettings({...writeSettings, useExistingContent: e.target.checked})}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                <span className="material-symbols-outlined" style={{fontSize: '18px'}}>bar_chart</span>
                希望文字数
              </label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={writeSettings.wordCount}
                onChange={(e) => setWriteSettings({...writeSettings, wordCount: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                <span className="material-symbols-outlined" style={{fontSize: '18px'}}>visibility</span>
                視点
              </label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={writeSettings.pov}
                onChange={(e) => setWriteSettings({...writeSettings, pov: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose} disabled={isGeneratingStory}>キャンセル</button>
          <button 
            className={styles.executeButton} 
            onClick={onExecute}
            disabled={isGeneratingStory}
          >
            <span className="material-symbols-outlined" style={{fontSize: '20px'}}>
              {isGeneratingStory ? 'sync' : 'edit'}
            </span>
            {isGeneratingStory ? '生成中...' : '生成を実行'}
          </button>
        </div>
      </div>
    </div>
  );
};
