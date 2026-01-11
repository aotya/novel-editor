'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './plot.module.css';

type PlotCard = {
  id: string;
  list_id: string;
  content: string;
  note: string | null;
  order_index: number;
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

export default function PlotBoard({ novelId, novelTitle }: Props) {
  const [lists, setLists] = useState<PlotList[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletedListIds, setDeletedListIds] = useState<string[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    fetchPlotData();
  }, [novelId]);

  const fetchPlotData = async () => {
    setLoading(true);
    setDeletedListIds([]);
    
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
      cards: cardsData.filter(c => c.list_id === list.id)
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
    
    const { data, error } = await supabase
      .from('plot_cards')
      .insert({
        list_id: listId,
        content: 'New Scene',
        note: null,
        order_index: newOrderIndex
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
          return { ...l, cards: [...l.cards, data] };
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

  const handleSave = async () => {
    setSaving(true);
    
    try {
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
                    list.cards.map((card) => (
                        <div key={card.id} className={styles.card}>
                        <div className={styles.editIconWrapper}>
                            <span className="material-symbols-outlined" style={{fontSize: '18px', color: '#94a3b8'}}>edit</span>
                        </div>
                        <textarea 
                            className={styles.cardText}
                            value={card.content || ''}
                            onChange={(e) => handleUpdateCardContent(list.id, card.id, e.target.value)}
                            style={{
                                width: '100%', 
                                background: 'transparent', 
                                border: 'none', 
                                resize: 'none', 
                                outline: 'none',
                                fontFamily: 'inherit',
                                fontSize: 'inherit',
                                color: 'inherit'
                            }}
                            rows={3}
                        />
                        {card.note && (
                            <div className={styles.cardFooter}>
                            <div className={styles.foreshadowBadge}>
                                <span className="material-symbols-outlined" style={{fontSize: '16px', color: '#f59e0b', marginTop: '2px'}}>lightbulb</span>
                                <p className={styles.foreshadowText}>{card.note}</p>
                            </div>
                            </div>
                        )}
                        </div>
                    ))
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
        )}
      </main>
    </div>
  );
}
