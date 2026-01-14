import React from 'react';
import styles from './edit.module.css';

type ToolbarProps = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  insertText: (text: string) => void;
  wrapSelection: (start: string, end: string) => void;
  insertRuby: () => void;
  isAutoIndentEnabled: boolean;
  setIsAutoIndentEnabled: (enabled: boolean) => void;
  isAiMode: boolean;
  toggleAiMode: () => void;
  handleSave: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
};

export const Toolbar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  insertText,
  wrapSelection,
  insertRuby,
  isAutoIndentEnabled,
  setIsAutoIndentEnabled,
  isAiMode,
  toggleAiMode,
  handleSave,
  saveStatus,
}: ToolbarProps) => {
  return (
    <header className={styles.toolbar}>
      <div className={styles.toolGroup}>
        {!isSidebarOpen && (
          <div className={styles.toolSection}>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={styles.toolButton}
              title="Open Sidebar"
            >
              <span className="material-symbols-outlined" style={{fontSize: '20px'}}>dock_to_right</span>
            </button>
          </div>
        )}
        
        <div className={styles.toolSection}>
          <button 
            onClick={() => insertText('……')}
            className={styles.toolButton}
            title="Insert Ellipsis"
          >
            <span style={{fontSize: '14px', fontWeight: 'bold'}}>……</span>
          </button>
          <button 
            onClick={() => insertText('――')}
            className={styles.toolButton}
            title="Insert Dash"
          >
             <span style={{fontSize: '14px', fontWeight: 'bold'}}>――</span>
          </button>
        </div>

        <div className={styles.toolSection}>
          <button 
            onClick={() => wrapSelection('「', '」')}
            className={styles.toolButton}
            title="Wrap in Brackets"
          >
            <span style={{fontSize: '14px', fontWeight: 'bold'}}>「」</span>
          </button>
          <button 
             onClick={() => wrapSelection('(', ')')}
             className={styles.toolButton}
             title="Wrap in Parentheses"
          >
             <span style={{fontSize: '14px', fontWeight: 'bold'}}>（）</span>
          </button>
          <button 
             onClick={insertRuby}
             className={styles.toolButton}
             title="Insert Ruby (|Text《...》)"
          >
            <span style={{fontSize: '12px', fontWeight: 'bold'}}>ルビ</span>
          </button>
          <button 
             onClick={() => setIsAutoIndentEnabled(!isAutoIndentEnabled)}
             className={`${styles.toolButton} ${isAutoIndentEnabled ? styles.toolButtonActive : ''}`}
             title={isAutoIndentEnabled ? "Auto Indent ON (Insert space on Enter)" : "Auto Indent OFF"}
          >
            <span className="material-symbols-outlined" style={{fontSize: '20px'}}>format_indent_increase</span>
          </button>
          
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb', margin: '0 8px' }}></div>
          
          <button 
             onClick={toggleAiMode}
             className={`${styles.toolButton} ${isAiMode ? styles.toolButtonActive : ''}`}
             title="AI Correction Mode"
          >
            <span className="material-symbols-outlined" style={{fontSize: '20px'}}>auto_awesome</span>
            {isAiMode && <span style={{fontSize: '12px', fontWeight: 'bold', marginLeft: '4px'}}>ON</span>}
          </button>
        </div>
      </div>

      <div className={styles.metaInfo}>
        <button 
          className={styles.toolButton} 
          title="Save"
          onClick={handleSave}
        >
          <span className="material-symbols-outlined" style={{fontSize: '20px'}}>save</span>
        </button>
        <span className={styles.saveStatus}>
          <span className={styles.statusDot} style={{backgroundColor: saveStatus === 'unsaved' ? '#fbbf24' : '#34d399'}}></span>
          {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
        </span>
        <div className={styles.metaDivider}></div>
      </div>
    </header>
  );
};
