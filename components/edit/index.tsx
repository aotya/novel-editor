"use client";

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from 'next/link';
import styles from './edit.module.css';

// Mock Data for Chapters
const CHAPTERS = [
  {
    id: 1,
    title: "Chapter 1: Waking Up",
    content: `
      <p>The sterile hum of the cryo-chamber was the first thing to greet his ears. It wasn't the silence of space he had expected, but a low, throbbing vibration that seemed to emanate from the very walls of the ship. He blinked, his eyelashes stiff with frost, trying to make sense of the blurry shapes hovering above him.</p>
      <p>"Vital signs stabilizing," a mechanical voice intoned, devoid of any warmth. "Subject 7-Alpha, welcome back to the waking world."</p>
      <p>He tried to speak, but his throat felt like it was lined with sandpaper. A coughing fit seized him, racking his emaciated frame against the cold metal of the pod. A tube retracted from his arm with a hiss, leaving a pinprick of blood that floated momentarily in the micro-gravity before being sucked into a ventilation duct.</p>
      <p>"Where..." he managed to rasp, the word barely a whisper. "Where is the crew?"</p>
      <p>The mechanical voice paused, the silence stretching longer than the hum of the engine. "You are the crew, Subject 7-Alpha. The others... expired during transit."</p>
      <p>He closed his eyes, the weight of the revelation settling on his chest heavier than the artificial gravity slowly spinning up. Expired. The word felt too clinical for death. Too neat. He pushed himself up, his muscles screaming in protest after decades of atrophy. He needed to see the bridge. He needed to see the stars.</p>
    `,
    words: 1204
  },
  {
    id: 2,
    title: "Chapter 2: The Briefing",
    content: `
      <p>The briefing room was cold, illuminated only by the holographic projector in the center. Dust motes danced in the blue light, swirling around the image of a planet that shouldn't exist.</p>
      <p>"This is Kepler-186f," the Commander said, her voice echoing in the empty room. "Or at least, what's left of it."</p>
      <p>He stared at the jagged cracks running across the planet's surface. It looked like a broken marble.</p>
    `,
    words: 850
  },
  {
    id: 3,
    title: "Chapter 3: Launch",
    content: `
      <p>The engines roared to life, a deafening sound that vibrated through his very bones. The g-force pressed him into the seat, stealing his breath.</p>
      <p>"Ignition sequence start," the countdown began. "3... 2... 1..."</p>
      <p>And then, they were weightless. The blue sky faded into the black abyss of space.</p>
    `,
    words: 920
  }
];

export default function Edit() {
  const [activeChapterId, setActiveChapterId] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const activeChapter = CHAPTERS.find(c => c.id === activeChapterId) || CHAPTERS[0];

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: activeChapter.content,
    editorProps: {
      attributes: {
        class: styles.editor,
      },
    },
    immediatelyRender: false,
  });

  // Update editor content when active chapter changes
  useEffect(() => {
    if (editor && activeChapter) {
      // Only update if content is different to avoid cursor jumping or loops
      // Simple check here, for production better content comparison might be needed
      if (editor.getHTML() !== activeChapter.content) {
         editor.commands.setContent(activeChapter.content);
      }
    }
  }, [activeChapterId, editor, activeChapter]);

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Left Sidebar */}
      <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.sidebarClosed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <h1 className={styles.projectTitle}>The Last Starship</h1>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className={styles.iconButton}
              title="Close Sidebar"
            >
              <span className="material-symbols-outlined" style={{fontSize: '20px'}}>dock_to_left</span>
            </button>
          </div>
          <Link href="/novel/the-last-starship" className={styles.backLink}>
            <span className="material-symbols-outlined" style={{fontSize: '16px'}}>arrow_back</span>
            Back to Dashboard
          </Link>
        </div>
        

        <div className={styles.actionButtonsGrid}>
          <button className={styles.actionButton}>
            <span className={`material-symbols-outlined ${styles.actionButtonIcon}`}>create_new_folder</span>
            <span>New Act</span>
          </button>
          <button className={styles.actionButton}>
            <span className={`material-symbols-outlined ${styles.actionButtonIcon}`}>swap_vert</span>
            <span>Reorder</span>
          </button>
        </div>

        <nav className={styles.navigation}>
          {/* Act 1 */}
          <div className={styles.actGroup}>
            <div className={styles.actHeader}>
              <div className={styles.actTitleWrapper}>
                <span className={`material-symbols-outlined ${styles.actIcon}`}>folder_open</span>
                <span className={styles.actTitle}>Act 1 - The Departure</span>
              </div>
              <div className={styles.itemActions}>
                <button 
                  className={`${styles.actionIcon} ${styles.actionIconEdit}`}
                  title="Rename Act"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Rename Act 1');
                  }}
                >
                  <span className="material-symbols-outlined" style={{fontSize: '16px'}}>edit</span>
                </button>
                <button 
                  className={styles.actionIcon}
                  title="Delete Act"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this Act?')) {
                      console.log('Delete Act 1');
                    }
                  }}
                >
                  <span className="material-symbols-outlined" style={{fontSize: '16px'}}>delete</span>
                </button>
              </div>
            </div>
            
            {CHAPTERS.map(chapter => (
              <div 
                key={chapter.id}
                onClick={() => setActiveChapterId(chapter.id)}
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
                      if (window.confirm(`Are you sure you want to delete "${chapter.title}"?`)) {
                        console.log(`Delete Chapter ${chapter.id}`);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined" style={{fontSize: '16px'}}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Act 2 */}
          <div className={styles.actGroup} style={{paddingTop: '0.5rem'}}>
            <div className={styles.actHeader}>
              <div className={styles.actTitleWrapper}>
                <span className={`material-symbols-outlined ${styles.actIcon}`}>folder</span>
                <span className={styles.actTitle}>Act 2 - The Void</span>
              </div>
              <div className={styles.itemActions}>
                <button 
                  className={`${styles.actionIcon} ${styles.actionIconEdit}`}
                  title="Rename Act"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Rename Act 2');
                  }}
                >
                  <span className="material-symbols-outlined" style={{fontSize: '16px'}}>edit</span>
                </button>
                <button 
                  className={styles.actionIcon}
                  title="Delete Act"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this Act?')) {
                      console.log('Delete Act 2');
                    }
                  }}
                >
                  <span className="material-symbols-outlined" style={{fontSize: '16px'}}>delete</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.newChapterButton}>
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
              onClick={() => {
                // Mock save action
                console.log('Saving content...');
              }}
            >
              <span className="material-symbols-outlined" style={{fontSize: '20px'}}>save</span>
            </button>
            <span className={styles.saveStatus}>
              <span className={styles.statusDot}></span>
              Saved just now
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
            <div className={styles.paperContent} onClick={(e) => e.stopPropagation()}>
              <input 
                className={styles.chapterTitleInput} 
                placeholder="Chapter Title" 
                type="text" 
                value={activeChapter.title}
                readOnly
              />
              
              <div className={styles.chapterMeta}>
                <span className={styles.metaItem}>
                  <span className="material-symbols-outlined" style={{fontSize: '16px'}}>schedule</span>
                  Draft
                </span>
                <span className={styles.metaItem}>
                  <span className="material-symbols-outlined" style={{fontSize: '16px'}}>bar_chart</span>
                  {activeChapter.words} words
                </span>
              </div>

              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
