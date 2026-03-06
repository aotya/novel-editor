import React from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import styles from './edit.module.css';

type Chapter = {
  id: string;
  title: string;
  updated_at: string;
  content: any;
  words_count: number;
  status?: string;
  episode_number?: number | null;
};

type EditorPaperProps = {
  activeChapter: Chapter | null;
  chapterTitle: string;
  setChapterTitle: (title: string) => void;
  saveStatus: string;
  setSaveStatus: (status: any) => void;
  isAiMode: boolean;
  currentWordsCount: number;
  editor: Editor | null;
  chapterStatus: string;
  setChapterStatus: (status: string) => void;
  episodeNumber: number | null;
  setEpisodeNumber: (num: number | null) => void;
};

export const EditorPaper = ({
  activeChapter,
  chapterTitle,
  setChapterTitle,
  saveStatus,
  setSaveStatus,
  isAiMode,
  currentWordsCount,
  editor,
  chapterStatus,
  setChapterStatus,
  episodeNumber,
  setEpisodeNumber,
}: EditorPaperProps) => {
  if (!editor) return null;

  return (
    <div className={styles.editorContainer}>
      <div 
        className={styles.editorPaper} 
        onClick={() => editor.chain().focus().run()}
      >
        {activeChapter ? (
          <div className={styles.paperContent} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <input 
                  className={styles.chapterTitleInput} 
                  placeholder="Chapter Title" 
                  type="text" 
                  value={chapterTitle}
                  onChange={(e) => {
                      setChapterTitle(e.target.value);
                      if (saveStatus !== 'unsaved') setSaveStatus('unsaved');
                  }}
                />
                {isAiMode && (
                    <div className={styles.aiModeIndicator}>
                        <span className="material-symbols-outlined" style={{fontSize: '18px'}}>auto_awesome</span>
                        <span className={styles.aiModeText}>AI添削モード ON</span>
                    </div>
                )}
            </div>
            
            <div className={styles.chapterMeta}>
              <span className={styles.metaItem}>
                <span className="material-symbols-outlined" style={{fontSize: '16px'}}>schedule</span>
                {activeChapter?.updated_at ? activeChapter.updated_at.split('T')[0] : ''}
              </span>
              <span className={styles.metaItem}>
                <span className="material-symbols-outlined" style={{fontSize: '16px'}}>bar_chart</span>
                {currentWordsCount} words
              </span>
              <span className={styles.metaDivider}>|</span>
              <span className={styles.metaItem}>
                <span className="material-symbols-outlined" style={{fontSize: '16px'}}>tag</span>
                <input
                  type="number"
                  className={styles.episodeInput}
                  placeholder="話数"
                  value={episodeNumber ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEpisodeNumber(val === '' ? null : parseInt(val, 10));
                    if (saveStatus !== 'unsaved') setSaveStatus('unsaved');
                  }}
                  min={1}
                />
                話
              </span>
              <span className={styles.metaItem}>
                <select
                  className={styles.statusSelect}
                  value={chapterStatus}
                  onChange={(e) => {
                    setChapterStatus(e.target.value);
                    if (saveStatus !== 'unsaved') setSaveStatus('unsaved');
                  }}
                >
                  <option value="draft">下書き</option>
                  <option value="published">投稿済み</option>
                </select>
              </span>
            </div>

            <EditorContent editor={editor} />
          </div>
        ) : (
           <div className={styles.paperContent} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999'}}>
              <p>Select a chapter to start editing</p>
           </div>
        )}
      </div>
    </div>
  );
};
