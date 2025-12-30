"use client";

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from 'next/link';
import styles from './edit.module.css';
import { createClient } from '@/lib/supabase/client';
import { 
  updateChapterContent, 
  updateChapterTitle, 
  createChapter, 
  deleteChapter,
  deleteAct,
  renameAct,
  createAct
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

  const handleCreateChapter = async () => {
    if (saveStatus === 'unsaved') {
      const confirmCreate = window.confirm('You have unsaved changes. Are you sure you want to create a new chapter without saving current one?');
      if (!confirmCreate) return;
    }

    // Determine target act: current active chapter's act, or the first act
    let targetActId = acts[0]?.id;
    if (activeChapterId) {
        const foundAct = acts.find(act => act.chapters.some(c => c.id === activeChapterId));
        if (foundAct) targetActId = foundAct.id;
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
          <button className={styles.actionButton}>
            <span className={`material-symbols-outlined ${styles.actionButtonIcon}`}>swap_vert</span>
            <span>Reorder</span>
          </button>
        </div>

        <nav className={styles.navigation}>
          {acts.map(act => (
            <div key={act.id} className={styles.actGroup}>
              <div className={styles.actHeader}>
                <div className={styles.actTitleWrapper}>
                  <span className={`material-symbols-outlined ${styles.actIcon}`}>folder_open</span>
                  <span className={styles.actTitle}>{act.title}</span>
                </div>
                <div className={styles.itemActions}>
                  <button 
                    className={`${styles.actionIcon} ${styles.actionIconEdit}`}
                    title="Rename Act"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameAct(act.id, act.title);
                    }}
                  >
                    <span className="material-symbols-outlined" style={{fontSize: '16px'}}>edit</span>
                  </button>
                  <button 
                    className={styles.actionIcon}
                    title="Delete Act"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAct(act.id);
                    }}
                  >
                    <span className="material-symbols-outlined" style={{fontSize: '16px'}}>delete</span>
                  </button>
                </div>
              </div>
              
              {act.chapters.map(chapter => (
                <div 
                  key={chapter.id}
                  onClick={() => handleChapterSelect(chapter.id)}
                  className={`${styles.chapterItem} ${activeChapterId === chapter.id ? styles.chapterItemActive : ''}`}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.chapterContentWrapper}>
                    <span className={`material-symbols-outlined ${styles.chapterIcon}`}>article</span>
                    <span className={styles.chapterTitle}>{chapter.title}</span>
                  </div>
                  <div className={styles.itemActions}>
                    <button 
                      className={styles.actionIcon}
                      title="Delete Chapter"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(chapter.id, chapter.title);
                      }}
                    >
                      <span className="material-symbols-outlined" style={{fontSize: '16px'}}>delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          
          {acts.length === 0 && (
             <div style={{padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem'}}>
               No acts yet. Create one to start writing!
             </div>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.newChapterButton} onClick={handleCreateChapter}>
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
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`${styles.toolButton} ${editor.isActive('bold') ? styles.toolButtonActive : ''}`}
                title="Bold"
              >
                <span className="material-symbols-outlined" style={{fontSize: '20px'}}>format_bold</span>
              </button>
              <button 
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`${styles.toolButton} ${editor.isActive('italic') ? styles.toolButtonActive : ''}`}
                title="Italic"
              >
                <span className="material-symbols-outlined" style={{fontSize: '20px'}}>format_italic</span>
              </button>
              <button 
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`${styles.toolButton} ${editor.isActive('underline') ? styles.toolButtonActive : ''}`}
                title="Underline"
              >
                <span className="material-symbols-outlined" style={{fontSize: '20px'}}>format_underlined</span>
              </button>
            </div>
            
            <div className={styles.toolSection}>
              <button className={styles.toolSelect}>
                Normal
                <span className="material-symbols-outlined" style={{fontSize: '18px'}}>arrow_drop_down</span>
              </button>
            </div>
            
            <div className={styles.toolSection}>
              <button 
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`${styles.toolButton} ${editor.isActive({ textAlign: 'left' }) ? styles.toolButtonActive : ''}`}
                title="Align Left"
              >
                <span className="material-symbols-outlined" style={{fontSize: '20px'}}>format_align_left</span>
              </button>
              <button className={styles.toolButton} title="Comment">
                <span className="material-symbols-outlined" style={{fontSize: '20px'}}>comment</span>
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
