'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './plot.module.css';

type PlotCard = {
  id: string;
  list_id: string;
  content: string;
  note: string | null;
  order_index: number;
  episode: number;
};

type PlotList = {
  id: string;
  title: string;
  order_index: number;
  cards: PlotCard[];
};

type Props = {
  novelId: string;
  novelTitle: string;
};

// Sortable Card Component
type SortableCardProps = {
  card: PlotCard;
  listId: string;
  onUpdateContent: (listId: string, cardId: string, content: string) => void;
  onUpdateEpisode: (listId: string, cardId: string, episode: number) => void;
  onDeleteCard: (listId: string, cardId: string) => void;
};

function SortableCard({ card, listId, onUpdateContent, onUpdateEpisode, onDeleteCard }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
    >
      <div className={styles.episodeBadge}>
        第 
        <input 
            type="number" 
            min="1"
            className={styles.episodeInput}
            value={card.episode}
            onChange={(e) => onUpdateEpisode(listId, card.id, parseInt(e.target.value) || 1)}
        /> 
        話
      </div>
      <div className={styles.cardActions}>
        <div 
          className={styles.editIconWrapper}
          {...attributes}
          {...listeners}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>drag_indicator</span>
        </div>
        <button 
          className={styles.deleteCardButton}
          onClick={() => onDeleteCard(listId, card.id)}
          title="シーンを削除"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>close</span>
        </button>
      </div>
      <textarea
        className={styles.cardText}
        value={card.content || ''}
        onChange={(e) => onUpdateContent(listId, card.id, e.target.value)}
        rows={3}
      />
      {card.note && (
        <div className={styles.cardFooter}>
          <div className={styles.foreshadowBadge}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#f59e0b', marginTop: '2px' }}>lightbulb</span>
            <p className={styles.foreshadowText}>{card.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlotBoard({ novelId, novelTitle }: Props) {
  const [lists, setLists] = useState<PlotList[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletedListIds, setDeletedListIds] = useState<string[]>([]);
  const [deletedCardIds, setDeletedCardIds] = useState<string[]>([]);
  const [activeCard, setActiveCard] = useState<PlotCard | null>(null);
  
  const supabase = createClient();

  // Configure sensors for drag and drop
  // Touch sensor has delay for long press on mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300, // Long press for mobile (300ms)
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchPlotData();
  }, [novelId]);

  const fetchPlotData = async () => {
    setLoading(true);
    setDeletedListIds([]);
    setDeletedCardIds([]);
    
    // Fetch Lists
    const { data: listsData, error: listsError } = await supabase
      .from('plot_lists')
      .select('*')
      .eq('novel_id', novelId)
      .order('order_index', { ascending: true });

    if (listsError) {
      console.error('Error fetching lists:', listsError);
      setLoading(false);
      return;
    }

    // Fetch Cards
    // In a larger app, we might fetch cards per list or use a join, 
    // but for now fetch all cards for these lists
    const listIds = listsData.map(l => l.id);
    let cardsData: any[] = [];
    
    if (listIds.length > 0) {
        const { data: cards, error: cardsError } = await supabase
        .from('plot_cards')
        .select('*')
        .in('list_id', listIds)
        .order('order_index', { ascending: true });
        
        if (cardsError) {
            console.error('Error fetching cards:', cardsError);
        } else {
            cardsData = cards;
        }
    }

    // Combine
    const combinedLists: PlotList[] = listsData.map(list => ({
      ...list,
      cards: cardsData.filter(c => c.list_id === list.id).map(c => ({
        ...c,
        episode: c.episode || 1 // Ensure episode exists
      }))
    }));

    setLists(combinedLists);
    setLoading(false);
  };

  const handleAddChapter = async () => {
    const newOrderIndex = lists.length;
    const defaultTitle = `Chapter ${newOrderIndex + 1}`;
    
    const { data, error } = await supabase
      .from('plot_lists')
      .insert({
        novel_id: novelId,
        title: defaultTitle,
        order_index: newOrderIndex
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding chapter:', error);
      alert('Failed to add chapter');
      return;
    }

    if (data) {
      setLists(prev => [...prev, { ...data, cards: [] }]);
    }
  };

  const handleAddScene = async (listId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const newOrderIndex = list.cards.length;
    // Default to the last card's episode or 1
    const lastCard = list.cards[list.cards.length - 1];
    const defaultEpisode = lastCard ? lastCard.episode : 1;
    
    const { data, error } = await supabase
      .from('plot_cards')
      .insert({
        list_id: listId,
        content: 'New Scene',
        note: null,
        order_index: newOrderIndex,
        episode: defaultEpisode
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding scene:', error);
      alert('Failed to add scene');
      return;
    }

    if (data) {
      setLists(prev => prev.map(l => {
        if (l.id === listId) {
          return { ...l, cards: [...l.cards, { ...data, episode: data.episode || defaultEpisode }] };
        }
        return l;
      }));
    }
  };

  const handleDeleteList = (listId: string) => {
    if (window.confirm('この章を削除してもよろしいですか？')) {
      setLists(prev => prev.filter(l => l.id !== listId));
      setDeletedListIds(prev => [...prev, listId]);
    }
  };

  const handleUpdateListTitle = (listId: string, newTitle: string) => {
      // Optimistic update only - no DB call
      setLists(prev => prev.map(l => l.id === listId ? { ...l, title: newTitle } : l));
  };

  const handleUpdateCardContent = (listId: string, cardId: string, newContent: string) => {
      // Optimistic update only - no DB call
      setLists(prev => prev.map(l => {
          if (l.id === listId) {
              return {
                  ...l,
                  cards: l.cards.map(c => c.id === cardId ? { ...c, content: newContent } : c)
              };
          }
          return l;
      }));
  };

  const handleUpdateCardEpisode = (listId: string, cardId: string, newEpisode: number) => {
      // Optimistic update only - no DB call
      setLists(prev => prev.map(l => {
          if (l.id === listId) {
              return {
                  ...l,
                  cards: l.cards.map(c => c.id === cardId ? { ...c, episode: newEpisode } : c)
              };
          }
          return l;
      }));
  };

  const handleDeleteCard = (listId: string, cardId: string) => {
    if (window.confirm('このシーンを削除してもよろしいですか？')) {
      setLists(prev => prev.map(l => {
        if (l.id === listId) {
          return {
            ...l,
            cards: l.cards.filter(c => c.id !== cardId).map((card, index) => ({
              ...card,
              order_index: index
            }))
          };
        }
        return l;
      }));
      setDeletedCardIds(prev => [...prev, cardId]);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find the card being dragged
    for (const list of lists) {
      const card = list.cards.find(c => c.id === active.id);
      if (card) {
        setActiveCard(card);
        break;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || active.id === over.id) {
      return;
    }

    // Find which list contains the active card
    let sourceListId: string | null = null;
    let sourceList: PlotList | null = null;
    
    for (const list of lists) {
      if (list.cards.find(c => c.id === active.id)) {
        sourceListId = list.id;
        sourceList = list;
        break;
      }
    }

    if (!sourceListId || !sourceList) return;

    // Reorder within the same list
    const oldIndex = sourceList.cards.findIndex(c => c.id === active.id);
    const newIndex = sourceList.cards.findIndex(c => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      setLists(prev => prev.map(l => {
        if (l.id === sourceListId) {
          const newCards = arrayMove(l.cards, oldIndex, newIndex);
          // Update order_index for all cards
          return {
            ...l,
            cards: newCards.map((card, index) => ({
              ...card,
              order_index: index,
            })),
          };
        }
        return l;
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
        // Delete Cards
        if (deletedCardIds.length > 0) {
            const { error: deleteCardError } = await supabase
                .from('plot_cards')
                .delete()
                .in('id', deletedCardIds);
            
            if (deleteCardError) throw deleteCardError;
        }

        // Delete Lists
        if (deletedListIds.length > 0) {
            const { error: deleteError } = await supabase
                .from('plot_lists')
                .delete()
                .in('id', deletedListIds);
            
            if (deleteError) throw deleteError;
        }

        // Prepare data for upsert
        // We only send fields that are editable or necessary for identification
        const listsToUpdate = lists.map(l => ({
            id: l.id,
            novel_id: novelId,
            title: l.title,
            order_index: l.order_index,
            updated_at: new Date().toISOString()
        }));

        // Flatten cards
        const cardsToUpdate = lists.flatMap(l => l.cards.map(c => ({
            id: c.id,
            list_id: l.id,
            content: c.content,
            note: c.note,
            order_index: c.order_index,
            episode: c.episode,
            updated_at: new Date().toISOString()
        })));

        // Upsert Lists
        if (listsToUpdate.length > 0) {
            const { error: listError } = await supabase
                .from('plot_lists')
                .upsert(listsToUpdate);
                
            if (listError) throw listError;
        }

        // Upsert Cards
        if (cardsToUpdate.length > 0) {
            const { error: cardError } = await supabase
                .from('plot_cards')
                .upsert(cardsToUpdate);
                
            if (cardError) throw cardError;
        }

        // Clear deleted IDs after successful save
        setDeletedListIds([]);
        setDeletedCardIds([]);
        alert('保存しました');
    } catch (error) {
        console.error('Error saving data:', error);
        alert('保存に失敗しました');
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoGroup}>
            <div className={styles.logoIcon}>
              <span className="material-symbols-outlined" style={{fontSize: '20px'}}>auto_stories</span>
            </div>
            <span className={styles.logoText}>NovelStudio</span>
          </div>
          
          <div className={styles.divider}></div>
          
          <div className={styles.titleGroup}>
            <Link href={`/novel/${novelId}`} className={styles.backButton}>
              <span className="material-symbols-outlined" style={{fontSize: '20px'}}>arrow_back</span>
            </Link>
            <div className={styles.titleWrapper}>
              <h1 className={styles.novelTitle}>{novelTitle}</h1>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button 
            className={styles.saveButton} 
            onClick={handleSave}
            disabled={saving}
          >
            <span className="material-symbols-outlined" style={{fontSize: '18px'}}>
                {saving ? 'sync' : 'save'}
            </span>
            <span>{saving ? '保存中...' : '保存'}</span>
          </button>
        </div>
      </header>

      {/* Main Board */}
      <main className={styles.main}>
        {loading ? (
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8'}}>
                Loading plot...
            </div>
        ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
            <div className={styles.boardContainer}>
            {lists.map((list) => (
                <div key={list.id} className={styles.column}>
                <div className={styles.columnHeader}>
                    <div className={styles.columnTitleContainer}>
                        <input 
                            className={styles.columnTitle} 
                            value={list.title}
                            onChange={(e) => handleUpdateListTitle(list.id, e.target.value)}
                            style={{background: 'transparent', border: 'none', outline: 'none', width: '100%'}}
                        />
                    </div>
                    <button 
                        className={styles.moreButton}
                        onClick={() => handleDeleteList(list.id)}
                        title="Delete Chapter"
                    >
                    <span className="material-symbols-outlined" style={{fontSize: '20px'}}>delete</span>
                    </button>
                </div>

                <div className={styles.columnContent}>
                    {list.cards.length > 0 ? (
                    <SortableContext
                      items={list.cards.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {list.cards.map((card) => (
                        <SortableCard
                          key={card.id}
                          card={card}
                          listId={list.id}
                          onUpdateContent={handleUpdateCardContent}
                          onUpdateEpisode={handleUpdateCardEpisode}
                          onDeleteCard={handleDeleteCard}
                        />
                      ))}
                    </SortableContext>
                    ) : (
                    <div className={styles.emptyState}>
                        <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>post_add</span>
                        <span className={styles.emptyStateText}>シーンがありません</span>
                    </div>
                    )}
                </div>

                <div className={styles.columnFooter}>
                    <button className={styles.addSceneButton} onClick={() => handleAddScene(list.id)}>
                    <span className="material-symbols-outlined" style={{fontSize: '18px'}}>add</span>
                    シーンを追加
                    </button>
                </div>
                </div>
            ))}

            {/* Add Chapter Column */}
            <div className={styles.addChapterColumn}>
                <button className={styles.addChapterCard} onClick={handleAddChapter}>
                <div className={styles.addChapterIconCircle}>
                    <span className="material-symbols-outlined" style={{fontSize: '24px'}}>add</span>
                </div>
                <span>新しい章を追加</span>
                </button>
            </div>
            </div>

            {/* Drag Overlay - shows the card being dragged */}
            <DragOverlay>
              {activeCard ? (
                <div className={`${styles.card} ${styles.cardOverlay}`}>
                  <div className={styles.episodeBadge}>
                    第 
                    <input 
                        type="number" 
                        min="1"
                        className={styles.episodeInput}
                        value={activeCard.episode}
                        readOnly
                    /> 
                    話
                  </div>
                  <div className={styles.editIconWrapper}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>drag_indicator</span>
                  </div>
                  <div className={styles.cardText}>{activeCard.content || ''}</div>
                  {activeCard.note && (
                    <div className={styles.cardFooter}>
                      <div className={styles.foreshadowBadge}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#f59e0b', marginTop: '2px' }}>lightbulb</span>
                        <p className={styles.foreshadowText}>{activeCard.note}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </DragOverlay>
            </DndContext>
        )}
      </main>
    </div>
  );
}
