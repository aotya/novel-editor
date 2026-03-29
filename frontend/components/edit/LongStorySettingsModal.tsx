import React, { useMemo } from 'react';
import styles from './edit.module.css';

type LongStorySettings = {
  instructions: string;
  useCharacters: boolean;
  usePlot: boolean;
  useRelationships: boolean;
  useWorldElements: boolean;
  wordCount: string;
  currentEpisode: number;
};

type Novel = {
  id: string;
  title: string;
  synopsis?: string;
  perspective?: string;
};

type PublishedChapter = {
  episodeNumber: number;
  title: string;
  wordsCount: number;
};

type PlotCard = {
  id: string;
  content: string;
  episode: number;
  order_index: number;
};

type PlotList = {
  id: string;
  title: string;
  order_index: number;
  plot_cards: PlotCard[];
};

type LongStorySettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  novel: Novel;
  longStorySettings: LongStorySettings;
  setLongStorySettings: (settings: LongStorySettings) => void;
  isGenerating: boolean;
  onExecute: () => Promise<void>;
  publishedChapters: PublishedChapter[];
  plotLists: PlotList[];
};

export const LongStorySettingsModal = ({
  isOpen,
  onClose,
  novel,
  longStorySettings,
  setLongStorySettings,
  isGenerating,
  onExecute,
  publishedChapters,
  plotLists,
}: LongStorySettingsModalProps) => {
  if (!isOpen) return null;

  const totalPublishedWords = publishedChapters.reduce((sum, ch) => sum + ch.wordsCount, 0);
  const lastEpisode = publishedChapters.length > 0 
    ? Math.max(...publishedChapters.map(ch => ch.episodeNumber))
    : 0;

  // Get matching plot cards for current episode (from all lists)
  const matchingPlotCards = useMemo(() => {
    if (!longStorySettings.usePlot) return [];

    const cards: { listTitle: string; content: string }[] = [];
    plotLists.forEach(list => {
      const matchingCards = (list.plot_cards || [])
        .filter(c => c.episode === longStorySettings.currentEpisode)
        .sort((a, b) => a.order_index - b.order_index);
      
      matchingCards.forEach(card => {
        cards.push({
          listTitle: list.title,
          content: card.content
        });
      });
    });

    return cards;
  }, [plotLists, longStorySettings.usePlot, longStorySettings.currentEpisode]);

  // Validation
  const hasPlotValidationError = longStorySettings.usePlot && matchingPlotCards.length === 0;
  const canExecute = !hasPlotValidationError;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleWrapper}>
            <span className={`material-symbols-outlined ${styles.modalHeaderIcon}`}>auto_stories</span>
            <span className={styles.modalTitle}>長編生成の設定</span>
          </div>
          <button className={styles.modalCloseButton} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* 小説情報 */}
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

          {/* 投稿済みエピソード情報 */}
          <div className={styles.settingsSection}>
            <div className={styles.settingsSectionTitle}>
              <span className="material-symbols-outlined" style={{fontSize: '18px'}}>history</span>
              投稿済みエピソード
            </div>
            
            <div className={styles.publishedInfo}>
              {publishedChapters.length > 0 ? (
                <>
                  <div className={styles.publishedStat}>
                    <span className={styles.publishedStatLabel}>投稿済み話数</span>
                    <span className={styles.publishedStatValue}>{publishedChapters.length}話</span>
                  </div>
                  <div className={styles.publishedStat}>
                    <span className={styles.publishedStatLabel}>合計文字数</span>
                    <span className={styles.publishedStatValue}>{totalPublishedWords.toLocaleString()}字</span>
                  </div>
                  <div className={styles.publishedStat}>
                    <span className={styles.publishedStatLabel}>最新話</span>
                    <span className={styles.publishedStatValue}>第{lastEpisode}話</span>
                  </div>
                  <div className={styles.publishedChapterList}>
                    {publishedChapters.slice(-5).map((ch) => (
                      <div key={ch.episodeNumber} className={styles.publishedChapterItem}>
                        <span className={styles.publishedChapterEpisode}>第{ch.episodeNumber}話</span>
                        <span className={styles.publishedChapterTitle}>{ch.title}</span>
                        <span className={styles.publishedChapterWords}>{ch.wordsCount}字</span>
                      </div>
                    ))}
                    {publishedChapters.length > 5 && (
                      <div className={styles.publishedChapterMore}>
                        ...他 {publishedChapters.length - 5} 話
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className={styles.noPublishedChapters}>
                  <span className="material-symbols-outlined" style={{fontSize: '24px', opacity: 0.5}}>rocket_launch</span>
                  <span>第1話から始めましょう！</span>
                  <span style={{fontSize: '0.75rem', opacity: 0.7}}>
                    小説の設定とあらすじを元に、最初のエピソードを生成します。
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 今回の執筆設定 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
              <span className="material-symbols-outlined" style={{fontSize: '18px'}}>tag</span>
              今回執筆する話数
            </label>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <span>第</span>
              <input 
                type="number" 
                className={styles.formInput} 
                style={{width: '80px', textAlign: 'center'}}
                value={longStorySettings.currentEpisode}
                onChange={(e) => setLongStorySettings({
                  ...longStorySettings, 
                  currentEpisode: parseInt(e.target.value) || 1
                })}
                min={1}
              />
              <span>話</span>
              {lastEpisode > 0 && longStorySettings.currentEpisode <= lastEpisode && (
                <span className={styles.warningText}>
                  ⚠️ 既存の話数と重複しています
                </span>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>今回の執筆指示</label>
            <textarea 
              className={styles.formTextarea} 
              placeholder="例：主人公が初めてダンジョンに挑む。仲間との絆を深めるシーンを入れてください。"
              value={longStorySettings.instructions}
              onChange={(e) => setLongStorySettings({...longStorySettings, instructions: e.target.value})}
            />
          </div>

          {/* 参照データの設定 */}
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
                  checked={longStorySettings.useCharacters}
                  onChange={(e) => setLongStorySettings({...longStorySettings, useCharacters: e.target.checked})}
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
                  checked={longStorySettings.usePlot}
                  onChange={(e) => setLongStorySettings({...longStorySettings, usePlot: e.target.checked})}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            {/* 該当プロットのプレビュー */}
            {longStorySettings.usePlot && (
              <div className={styles.subSettingItem}>
                <div className={styles.plotPreview}>
                  <div className={styles.plotPreviewHeader}>
                    <span className="material-symbols-outlined" style={{fontSize: '16px'}}>visibility</span>
                    第{longStorySettings.currentEpisode}話のプロット（{matchingPlotCards.length}件）
                  </div>
                  
                  {matchingPlotCards.length > 0 ? (
                    <div className={styles.plotPreviewList}>
                      {matchingPlotCards.slice(0, 5).map((card, idx) => (
                        <div key={idx} className={styles.plotPreviewItem}>
                          <span className={styles.plotPreviewChapter}>{card.listTitle}</span>
                          <span className={styles.plotPreviewContent}>
                            {card.content.length > 50 ? card.content.slice(0, 50) + '...' : card.content}
                          </span>
                        </div>
                      ))}
                      {matchingPlotCards.length > 5 && (
                        <div className={styles.plotPreviewMore}>
                          ...他 {matchingPlotCards.length - 5} 件
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.plotPreviewEmpty}>
                      <span className="material-symbols-outlined" style={{fontSize: '20px'}}>warning</span>
                      <span>第{longStorySettings.currentEpisode}話のプロットが見つかりません</span>
                      <span className={styles.plotPreviewEmptyHint}>
                        プロット画面で該当話数のカードを作成してください
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  checked={longStorySettings.useRelationships}
                  onChange={(e) => setLongStorySettings({...longStorySettings, useRelationships: e.target.checked})}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingItemLeft}>
                <div className={`${styles.settingItemIcon} ${styles.settingItemIconTeal}`}>
                  <span className="material-symbols-outlined">public</span>
                </div>
                <span className={styles.settingItemLabel}>世界観・国/組織情報の読み取り</span>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={longStorySettings.useWorldElements}
                  onChange={(e) => setLongStorySettings({...longStorySettings, useWorldElements: e.target.checked})}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>

          {/* 文字数設定 */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                <span className="material-symbols-outlined" style={{fontSize: '18px'}}>bar_chart</span>
                希望文字数
              </label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={longStorySettings.wordCount}
                onChange={(e) => setLongStorySettings({...longStorySettings, wordCount: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                <span className="material-symbols-outlined" style={{fontSize: '18px'}}>visibility</span>
                視点
              </label>
              <div className={styles.staticText} style={{padding: '0.75rem 1rem'}}>
                {novel?.perspective || "未設定"}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose} disabled={isGenerating}>キャンセル</button>
          <button 
            className={styles.executeButton} 
            onClick={onExecute}
            disabled={isGenerating || !canExecute}
            title={hasPlotValidationError ? '該当話数のプロットがありません' : ''}
          >
            <span className="material-symbols-outlined" style={{fontSize: '20px'}}>
              {isGenerating ? 'sync' : 'auto_stories'}
            </span>
            {isGenerating ? '生成中...' : `第${longStorySettings.currentEpisode}話を生成`}
          </button>
        </div>
      </div>
    </div>
  );
};
