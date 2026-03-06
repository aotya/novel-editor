import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './edit.module.css';

type Chapter = {
  id: string;
  title: string;
  [key: string]: any;
};

type Props = {
  chapter: Chapter;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  isReordering: boolean;
};

export function SortableChapterItem({ chapter, isActive, onSelect, onDelete, isReordering }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: chapter.id, disabled: !isReordering });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isReordering ? 'grab' : 'pointer',
    touchAction: 'none' as React.CSSProperties['touchAction'],
    position: 'relative' as React.CSSProperties['position'],
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isReordering && onSelect(chapter.id)}
      className={`${styles.chapterItem} ${isActive ? styles.chapterItemActive : ''}`}
      role="button"
      tabIndex={0}
    >
      <div className={styles.chapterContentWrapper}>
        <span className={`material-symbols-outlined ${styles.chapterIcon}`}>
          {isReordering ? 'drag_indicator' : 'article'}
        </span>
        <span className={styles.chapterTitle}>{chapter.title}</span>
      </div>
      {!isReordering && (
        <div className={styles.itemActions}>
          <button
            className={styles.actionIcon}
            title="Delete Chapter"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(chapter.id, chapter.title);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
