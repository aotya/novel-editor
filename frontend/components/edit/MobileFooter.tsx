import React from 'react';
import styles from './edit.module.css';

type MobileFooterProps = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  handleCreateChapter: () => Promise<void>;
};

export const MobileFooter = ({
  isSidebarOpen,
  setIsSidebarOpen,
  handleCreateChapter,
}: MobileFooterProps) => {
  return (
    <>
      <div 
        className={`${styles.mobileOverlay} ${isSidebarOpen ? styles.show : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />
      
      <footer className={styles.mobileFooter}>
        <div className={styles.mobileFooterContent}>
          <button 
            className={styles.mobileFooterButton}
            onClick={() => setIsSidebarOpen(true)}
          >
            <span className="material-symbols-outlined">format_list_bulleted</span>
            <span>Episode List</span>
          </button>
          <button 
            className={`${styles.mobileFooterButton} ${styles.mobileFooterButtonPrimary}`}
            onClick={() => handleCreateChapter()}
          >
            <span className="material-symbols-outlined">add</span>
            <span>Add New Episode</span>
          </button>
        </div>
      </footer>
    </>
  );
};
