import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableChapterItem } from './SortableChapterItem';
import styles from './edit.module.css';

type Chapter = {
  id: string;
  title: string;
  [key: string]: any;
};

type Act = {
  id: string;
  title: string;
  chapters: Chapter[];
  [key: string]: any;
};

type Props = {
  act: Act;
  activeChapterId: string | null;
  isReordering: boolean;
  onChapterSelect: (id: string) => void;
  onDeleteChapter: (id: string, title: string) => void;
  onRenameAct: (id: string, title: string) => void;
  onDeleteAct: (id: string) => void;
  onCreateChapter: (actId: string) => void;
};

export function ActItem({
  act,
  activeChapterId,
  isReordering,
  onChapterSelect,
  onDeleteChapter,
  onRenameAct,
  onDeleteAct,
  onCreateChapter
}: Props) {
  const { setNodeRef } = useDroppable({
    id: act.id,
    disabled: !isReordering,
    data: {
      type: 'Act',
      actId: act.id
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={styles.actGroup}
      style={{
        minHeight: isReordering ? '60px' : 'auto',
        backgroundColor: isReordering ? 'rgba(0,0,0,0.02)' : 'transparent',
        borderRadius: '0.5rem',
      }}
    >
      <div className={styles.actHeader}>
        <div className={styles.actTitleWrapper}>
          <span className={`material-symbols-outlined ${styles.actIcon}`}>folder_open</span>
          <span className={styles.actTitle}>{act.title}</span>
        </div>
        <div className={styles.itemActions}>
          {!isReordering && (
             <button 
                className={styles.actionIcon}
                title="Create Chapter in this Act"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateChapter(act.id);
                }}
              >
                <span className="material-symbols-outlined" style={{fontSize: '16px'}}>add</span>
              </button>
          )}
          <button 
            className={`${styles.actionIcon} ${styles.actionIconEdit}`}
            title="Rename Act"
            onClick={(e) => {
              e.stopPropagation();
              onRenameAct(act.id, act.title);
            }}
          >
            <span className="material-symbols-outlined" style={{fontSize: '16px'}}>edit</span>
          </button>
          <button 
            className={styles.actionIcon}
            title="Delete Act"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteAct(act.id);
            }}
          >
            <span className="material-symbols-outlined" style={{fontSize: '16px'}}>delete</span>
          </button>
        </div>
      </div>
      
      <SortableContext 
        items={act.chapters.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minHeight: isReordering ? '20px' : '0' }}>
            {act.chapters.map(chapter => (
            <SortableChapterItem
                key={chapter.id}
                chapter={chapter}
                isActive={activeChapterId === chapter.id}
                onSelect={onChapterSelect}
                onDelete={onDeleteChapter}
                isReordering={isReordering}
            />
            ))}
        </div>
      </SortableContext>
    </div>
  );
}
