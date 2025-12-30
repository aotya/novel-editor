"use client";

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from 'next/link';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import styles from './edit.module.css';
import { createClient } from '@/lib/supabase/client';
import { ActItem } from './ActItem';
import { 
  updateChapterContent, 
  updateChapterTitle, 
  createChapter, 
  deleteChapter,
  deleteAct,
  renameAct,
  createAct,
  updateChapterOrder
} from '@/app/novel/[slug]/edit/actions';

type Chapter = {
  id: string;
  act_id: string;
  novel_id: string;
  title: string;
  content: any; // JSON content
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
  // ... other fields
};

type EditProps = {
  novel: Novel;
  initialActs: Act[];
};

export default function Edit({ novel, initialActs }: EditProps) {
  const [acts, setActs] = useState<Act[]>(initialActs);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [chapterTitle, setChapterTitle] = useState('');
  const [currentWordsCount, setCurrentWordsCount] = useState(0);
    const [isReordering, setIsReordering] = useState(false);
  const [isAutoIndentEnabled, setIsAutoIndentEnabled] = useState(true);

  const IndentOnEnter = Extension.create({
    name: 'indentOnEnter',
    addStorage() {
        return {
            enabled: true,
        }
    },
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          if (this.storage.enabled) {
              return this.editor.chain()
                .splitBlock()
                .insertContent('　')
                .run();
          }
          return false; // Default behavior
        },
      }
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    // Validate drag over
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Find the acts containing these items
    const findAct = (id: string) => {
      // Check if id is an Act id
      const actById = acts.find(a => a.id === id);
      if (actById) return actById;
      
      // Check if id is a Chapter id
      return acts.find(act => act.chapters.some(c => c.id === id));
    };
    
    const activeAct = findAct(activeId as string);
    const overAct = findAct(overId as string);

    if (!activeAct || !overAct || activeAct === overAct) {
      return;
    }

    // Moving between different acts
    setActs((prev) => {
      const activeActIndex = prev.findIndex(a => a.id === activeAct.id);
      const overActIndex = prev.findIndex(a => a.id === overAct.id);
      
      if (activeActIndex === -1 || overActIndex === -1) return prev;

      const activeActData = prev[activeActIndex];
      const overActData = prev[overActIndex];
      
      // Find index of active chapter
      const activeIndex = activeActData.chapters.findIndex(c => c.id === activeId);
      
      // Find index to insert into
      let newIndex;
      if (overActData.id === overId) {
        // Dropped on the Act container itself -> add to end
        newIndex = overActData.chapters.length + 1;
      } else {
        // Dropped over another chapter
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top >
            over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overActData.chapters.findIndex(c => c.id === overId) + modifier;
      }

      return prev.map((act) => {
        if (act.id === activeActData.id) {
          return {
            ...act,
            chapters: act.chapters.filter((c) => c.id !== activeId),
          };
        } else if (act.id === overActData.id) {
          const newChapters = [
            ...act.chapters.slice(0, newIndex),
            activeActData.chapters[activeIndex],
            ...act.chapters.slice(newIndex, act.chapters.length),
          ];
          return {
            ...act,
            chapters: newChapters,
          };
        }
        return act;
      });
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    // In handleDragEnd, the state has already been optimistically updated by handleDragOver
    // for cross-act moves. We just need to find the new positions and persist.
    // However, for same-act reordering, handleDragOver doesn't run or do anything usually
    // (depending on implementation details, but sortable strategy handles intra-container sorts via transforms usually, 
    // unless we manually handle it. With SortableContext, handleDragOver is mostly for inter-container).
    // Actually, dnd-kit Sortable example handles intra-sort in DragOver too if configured, but typically 
    // we use arrayMove in DragEnd for same container.
    // Let's check the current state (acts) which might have been modified by DragOver.
    
    const activeId = active.id;
    const overId = over.id;

    // We need to re-locate where the items are in the *current* state (which might be modified by DragOver)
    const findAct = (id: string) => {
        const actById = acts.find(a => a.id === id);
        if (actById) return actById;
        return acts.find(act => act.chapters.some(c => c.id === id));
    };

    const activeAct = findAct(activeId as string);
    const overAct = findAct(overId as string);

    if (activeAct && overAct && activeAct.id === overAct.id) {
        // Same container reordering (either it was same container from start, or moved into same by DragOver)
        const actIndex = acts.findIndex(a => a.id === activeAct.id);
        const oldIndex = activeAct.chapters.findIndex(c => c.id === activeId);
        const newIndex = activeAct.chapters.findIndex(c => c.id === overId);

        if (oldIndex !== newIndex) {
            const newChapters = arrayMove(activeAct.chapters, oldIndex, newIndex);
            
            // Update local state
            const newActs = [...acts];
            newActs[actIndex] = { ...activeAct, chapters: newChapters };
            setActs(newActs);

            // Persist order
             const updates = newChapters.map((chapter, index) => ({
                id: chapter.id,
                order_index: index,
                act_id: activeAct.id // Ensure act_id is correct
            }));
            await updateChapterOrder(novel.id, updates);
        } else {
            // Even if index didn't change (e.g. dropped in place), 
            // if it was a cross-act move (detected by DragOver logic changing state), we must persist.
            // We can detect this if we track original state, but simpler to just persist if we know it *might* have changed acts.
            // Or simpler: persist the whole Act's chapter list whenever DragEnd happens on it.
            
            // To be safe and handle the cross-act persistence:
            // We should find which acts were involved. 
            // Since we don't easily know "was this cross-act?" without extra state tracking, 
            // and we rely on 'acts' being up-to-date from DragOver, 
            // let's just persist the active Act's chapters order and act_id.
             const updates = activeAct.chapters.map((chapter, index) => ({
                id: chapter.id,
                order_index: index,
                act_id: activeAct.id
            }));
            await updateChapterOrder(novel.id, updates);
        }
    }
  };
  
  // Find active chapter object
  const activeChapter = React.useMemo(() => {
    for (const act of acts) {
      const found = act.chapters.find(c => c.id === activeChapterId);
      if (found) return found;
    }
    return null;
  }, [acts, activeChapterId]);

  // Set initial active chapter if none selected and chapters exist
  useEffect(() => {
    if (!activeChapterId && acts.length > 0) {
      // Find first chapter
      for (const act of acts) {
        if (act.chapters.length > 0) {
          setActiveChapterId(act.chapters[0].id);
          break;
        }
      }
    }
  }, [acts, activeChapterId]);

  // Sync title input and word count with active chapter
  useEffect(() => {
    if (activeChapter) {
        setChapterTitle(activeChapter.title);
        setCurrentWordsCount(activeChapter.words_count || 0);
    }
  }, [activeChapter]);

  // Handle beforeunload event to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveStatus]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      IndentOnEnter,
    ],
    content: activeChapter?.content || '',
    editorProps: {
      attributes: {
        class: styles.editor,
      },
    },
    onUpdate: ({ editor }) => {
       if (saveStatus !== 'unsaved') {
          setSaveStatus('unsaved');
       }
       // Calculate word count excluding whitespace
       const text = editor.getText();
       const count = text.replace(/\s/g, '').length;
       setCurrentWordsCount(count);
    },
    immediatelyRender: false,
  });

  // Update storage when state changes
  useEffect(() => {
      if (editor) {
          // @ts-ignore - Custom extension storage type not inferred
          editor.storage.indentOnEnter.enabled = isAutoIndentEnabled;
      }
  }, [isAutoIndentEnabled, editor]);

  // Update editor content when active chapter changes
  useEffect(() => {
    if (editor && activeChapter) {
      // Check if content is different to avoid cursor jumps
      // Let's just set content for now when ID changes
       editor.commands.setContent(activeChapter.content || '');
       // Reset save status when switching chapters to avoid confusion
       setSaveStatus('saved');
    }
  }, [activeChapterId, editor]); 
 

  if (!editor) {
    return null;
  }

  // Helper to handle chapter selection with unsaved check
  const handleChapterSelect = (chapterId: string) => {
      if (chapterId === activeChapterId) return;

      if (saveStatus === 'unsaved') {
        const confirmSwitch = window.confirm('You have unsaved changes. Are you sure you want to switch chapters without saving?');
        if (!confirmSwitch) return;
      }
      setActiveChapterId(chapterId);
  };

  const handleSave = async () => {
    if (!activeChapter || !editor) return;

    setSaveStatus('saving');
    const content = editor.getJSON();
    
    // Calculate word count excluding whitespace for save
    const text = editor.getText();
    const count = text.replace(/\s/g, '').length;

    // Parallel save: Content and Title
    const promises = [];
    
    // Save content
    promises.push(updateChapterContent(activeChapter.id, content, count));

    // Save title if changed
    if (chapterTitle !== activeChapter.title) {
        promises.push(updateChapterTitle(activeChapter.id, novel.id, chapterTitle));
    }

    const results = await Promise.all(promises);
    const hasError = results.some(r => r.error);

    if (hasError) {
        console.error('Error saving:', results);
        setSaveStatus('unsaved'); // Or error state
        alert('Failed to save changes.');
    } else {
        setSaveStatus('saved');
        
        // Update local state to reflect changes
        setActs(prevActs => prevActs.map(act => ({
            ...act,
            chapters: act.chapters.map(ch => 
                ch.id === activeChapter.id 
                ? { ...ch, title: chapterTitle, content: content, words_count: count } 
                : ch
            )
        })));
    }
  };

  const handleCreateChapter = async (preferredActId?: string) => {
    if (saveStatus === 'unsaved') {
      const confirmCreate = window.confirm('You have unsaved changes. Are you sure you want to create a new chapter without saving current one?');
      if (!confirmCreate) return;
    }

    // Determine target act: 
    // 1. preferredActId (from explicit click)
    // 2. current active chapter's act
    // 3. the first act
    let targetActId = preferredActId;
    
    if (!targetActId) {
        if (activeChapterId) {
            const foundAct = acts.find(act => act.chapters.some(c => c.id === activeChapterId));
            if (foundAct) targetActId = foundAct.id;
        }
        if (!targetActId) {
            targetActId = acts[0]?.id;
        }
    }

    if (!targetActId) {
        alert("No Act found to create a chapter in.");
        return;
    }

    // Call server action
    const result = await createChapter(novel.id, targetActId, 'New Chapter');

    if (result.success && result.data) {
        const newChapter = result.data;
        
        // Update local state
        setActs(prevActs => prevActs.map(act => {
            if (act.id === targetActId) {
                return {
                    ...act,
                    chapters: [...act.chapters, newChapter]
                };
            }
            return act;
        }));

        // Switch to the new chapter
        setActiveChapterId(newChapter.id);
        // Reset title input
        setChapterTitle('New Chapter');
    } else {
        console.error('Failed to create chapter:', result.error);
        alert('Failed to create new chapter.');
    }
  };

  const handleDeleteChapter = async (chapterId: string, chapterTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${chapterTitle}"?`)) {
      const result = await deleteChapter(chapterId, novel.id);
      
      if (result.success) {
        setActs(prevActs => prevActs.map(act => ({
          ...act,
          chapters: act.chapters.filter(ch => ch.id !== chapterId)
        })));

        // If deleted chapter was active, switch to another one or clear selection
        if (activeChapterId === chapterId) {
          setActiveChapterId(null); // Or select another reasonable default
          // Ideally we should try to select the previous or next chapter, or first available
          // But for now, null is safe, user can select manually
        }
      } else {
        console.error('Failed to delete chapter:', result.error);
        alert('Failed to delete chapter.');
      }
    }
  };

  const handleDeleteAct = async (actId: string) => {
    if (window.confirm('Are you sure you want to delete this Act? All chapters inside will also be deleted.')) {
      const result = await deleteAct(actId, novel.id);
      
      if (result.success) {
        // If active chapter was in this act, clear selection
        const act = acts.find(a => a.id === actId);
        if (act && act.chapters.some(ch => ch.id === activeChapterId)) {
          setActiveChapterId(null);
        }

        setActs(prevActs => prevActs.filter(a => a.id !== actId));
      } else {
         console.error('Failed to delete act:', result.error);
         alert('Failed to delete act.');
      }
    }
  };

  const handleRenameAct = async (actId: string, currentTitle: string) => {
    const newTitle = window.prompt("Enter new Act title:", currentTitle);
    if (newTitle && newTitle !== currentTitle) {
      const result = await renameAct(actId, novel.id, newTitle);
      
      if (result.success) {
        setActs(prevActs => prevActs.map(act => 
          act.id === actId ? { ...act, title: newTitle } : act
        ));
      } else {
         console.error('Failed to rename act:', result.error);
         alert('Failed to rename act.');
      }
    }
  };

  const handleCreateAct = async () => {
    const result = await createAct(novel.id, "New Act");
    
    if (result.success && result.data) {
        const newAct = { ...result.data, chapters: [] };
        setActs(prev => [...prev, newAct]);
    } else {
        console.error('Failed to create act:', result.error);
        alert('Failed to create new act.');
    }
  };

  // Helper for Link click interception
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
     if (saveStatus === 'unsaved') {
        const confirmNav = window.confirm('You have unsaved changes. Are you sure you want to leave without saving?');
        if (!confirmNav) {
            e.preventDefault();
        }
     }
  };

  const insertText = (text: string) => {
      editor.chain().focus().insertContent(text).run();
  };

  const wrapSelection = (startChar: string, endChar: string) => {
      if (editor.state.selection.empty) {
          editor.chain().focus().insertContent(`${startChar}${endChar}`).setTextSelection(editor.state.selection.from + 1).run();
      } else {
          const { from, to } = editor.state.selection;
          const text = editor.state.doc.textBetween(from, to);
          editor.chain().focus().insertContentAt({ from, to }, `${startChar}${text}${endChar}`).run();
      }
  };

  const insertRuby = () => {
    if (editor.state.selection.empty) {
        const cursor = editor.state.selection.from;
        editor.chain().focus().insertContent('|《》').setTextSelection(cursor + 1).run();
    } else {
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to);
        editor.chain().focus().insertContentAt({ from, to }, `|${text}《》`).setTextSelection(from + 1 + text.length + 1).run();
    }
  };

  const autoIndent = () => {
      const { state, dispatch } = editor.view;
      const { doc, tr } = state;
      
      let changed = false;
      doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && node.textContent.length > 0) {
          const firstChar = node.textContent.charAt(0);
          // Skip if starts with brackets or already has space
          if (!['「', '『', '（', '　', ' '].includes(firstChar)) {
             tr.insertText('　', pos + 1);
             changed = true;
          }
        }
      });
      
      if (changed) {
          dispatch(tr);
      } else {
          alert('No indentation needed or already indented.');
      }
  };

  return (
    <div className={styles.container}>
      {/* Left Sidebar */}
      <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.sidebarClosed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <h1 className={styles.projectTitle}>{novel.title}</h1>
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
            New Chapter
          </button>
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className={styles.main}>
        {/* Top Toolbar */}
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
            <button className={styles.toolButton} title="Settings">
              <span className="material-symbols-outlined" style={{fontSize: '24px'}}>settings</span>
            </button>
          </div>
        </header>

        {/* Editor Canvas */}
        <div className={styles.editorContainer}>
          <div 
            className={styles.editorPaper} 
            onClick={() => editor.chain().focus().run()}
          >
            {activeChapter ? (
              <div className={styles.paperContent} onClick={(e) => e.stopPropagation()}>
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
                
                <div className={styles.chapterMeta}>
                  <span className={styles.metaItem}>
                    <span className="material-symbols-outlined" style={{fontSize: '16px'}}>schedule</span>
                    {activeChapter.status || 'Draft'}
                  </span>
                  <span className={styles.metaItem}>
                    <span className="material-symbols-outlined" style={{fontSize: '16px'}}>bar_chart</span>
                    {currentWordsCount} characters
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
      </main>
    </div>
  );
}
