import React from 'react';
import Link from 'next/link';
import { DndContext, closestCenter, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import styles from './edit.module.css';
import { ActItem } from './ActItem';

type Chapter = {
  id: string;
  act_id: string;
  novel_id: string;
  title: string;
  content: any;
  words_count: number;
  status: string;
  order_index: number;
  updated_at: string;
};

type Act = {
  id: string;
  novel_id: string;
  title: string;
  order_index: number;
  created_at: string;
  chapters: Chapter[];
};

type Novel = {
  id: string;
  title: string;
  synopsis?: string;
};

type SidebarProps = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  novel: Novel;
  handleLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  handleCreateAct: () => Promise<void>;
  isReordering: boolean;
  setIsReordering: (isReordering: boolean) => void;
  sensors: SensorDescriptor<SensorOptions>[];
  handleDragOver: (event: any) => void;
  handleDragEnd: (event: any) => Promise<void>;
  acts: Act[];
  activeChapterId: string | null;
  handleChapterSelect: (id: string) => void;
  handleDeleteChapter: (id: string, title: string) => Promise<void>;
  handleRenameAct: (id: string, title: string) => Promise<void>;
  handleDeleteAct: (id: string) => Promise<void>;
  handleCreateChapter: (preferredActId?: string) => Promise<void>;
};

export const Sidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  novel,
  handleLinkClick,
  handleCreateAct,
  isReordering,
  setIsReordering,
  sensors,
  handleDragOver,
  handleDragEnd,
  acts,
  activeChapterId,
  handleChapterSelect,
  handleDeleteChapter,
  handleRenameAct,
  handleDeleteAct,
  handleCreateChapter,
}: SidebarProps) => {
  return (
    <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.sidebarClosed : ''} ${isSidebarOpen ? styles.mobileOpen : ''}`}>
      <div className={styles.sidebarHeader}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <h1 className={styles.projectTitle}>{novel?.title}</h1>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className={styles.iconButton}
            title="Close Sidebar"
          >
            <span className="material-symbols-outlined" style={{fontSize: '20px'}}>dock_to_left</span>
          </button>
        </div>
        <Link 
          href={`/novel/${novel.id}`} 
          className={styles.backLink}
          onClick={(e) => handleLinkClick(e, `/novel/${novel.id}`)}
        >
          <span className="material-symbols-outlined" style={{fontSize: '16px'}}>arrow_back</span>
          Back to Dashboard
        </Link>
      </div>
      

      <div className={styles.actionButtonsGrid}>
        <button className={styles.actionButton} onClick={handleCreateAct}>
          <span className={`material-symbols-outlined ${styles.actionButtonIcon}`}>create_new_folder</span>
          <span>New Act</span>
        </button>
        <button 
          className={styles.actionButton} 
          onClick={() => setIsReordering(!isReordering)}
          style={isReordering ? { borderColor: 'var(--primary)', color: 'var(--primary)', backgroundColor: '#f3f4f6' } : {}}
        >
          <span 
            className={`material-symbols-outlined ${styles.actionButtonIcon}`}
            style={isReordering ? { color: 'var(--primary)' } : {}}
          >
            {isReordering ? 'check' : 'swap_vert'}
          </span>
          <span>{isReordering ? 'Done' : 'Reorder'}</span>
        </button>
      </div>

      <nav className={styles.navigation}>
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {acts.map(act => (
            <ActItem
              key={act.id}
              act={act}
              activeChapterId={activeChapterId}
              isReordering={isReordering}
              onChapterSelect={handleChapterSelect}
              onDeleteChapter={handleDeleteChapter}
              onRenameAct={handleRenameAct}
              onDeleteAct={handleDeleteAct}
              onCreateChapter={handleCreateChapter}
            />
          ))}
        </DndContext>
        
        {acts.length === 0 && (
          <div style={{padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem'}}>
            No acts yet. Create one to start writing!
          </div>
        )}
      </nav>

      <div className={styles.sidebarFooter}>
        <button className={styles.newChapterButton} onClick={() => handleCreateChapter()}>
          <span className="material-symbols-outlined" style={{fontSize: '20px'}}>add</span>
          新規追加
        </button>
      </div>
    </aside>
  );
};
