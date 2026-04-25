"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import styles from './edit.module.css';
import { AiHighlight } from './extensions/AiHighlight';
import { AiPanel } from './AiPanel';
import { WriteSettingsModal } from './WriteSettingsModal';
import { LongStorySettingsModal } from './LongStorySettingsModal';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { EditorPaper } from './EditorPaper';
import { 
  updateChapterContent, 
  updateChapterTitle, 
  updateChapterMeta,
  createChapter, 
  deleteChapter,
  deleteAct,
  renameAct,
  createAct,
  updateChapterOrder,
  proofreadContent,
  rewriteContent,
  generateStory,
  generateLongStory,
  fetchPlotListsForNovel,
} from '@/app/novel/[slug]/edit/actions';
import type { RewriteEnrichmentParams } from '@/app/novel/[slug]/edit/actions';

type Suggestion = {
  id: string;
  type: 'typo' | 'grammar' | 'expression';
  originalText: string;
  suggestedText: string;
  description: string;
  label: string;
};

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
  episode_number?: number | null;
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
  perspective?: string;
  world_setting?: string;
  // ... other fields
};

type EditProps = {
  novel: Novel;
  initialActs: Act[];
};

export default function Edit({ novel, initialActs }: EditProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [acts, setActs] = useState<Act[]>(initialActs);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const [currentWordsCount, setCurrentWordsCount] = useState(0);
  const [isReordering, setIsReordering] = useState(false);
  const [chapterStatus, setChapterStatus] = useState<string>('draft');
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null);
  
  // Plot Lists State
  const [plotLists, setPlotLists] = useState<any[]>([]);
  
  // AI Mode State
  const [isAiMode, setIsAiMode] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [aiActiveTab, setAiActiveTab] = useState<'proofread' | 'edit' | 'write'>('proofread');
  const [hasProofreadRun, setHasProofreadRun] = useState(false);
  
  // Edit Mode State
  const [editTargetRange, setEditTargetRange] = useState<'selection' | 'all'>('selection');
  const [editInstruction, setEditInstruction] = useState('');
  const [selectionLength, setSelectionLength] = useState(0);
  const [editResult, setEditResult] = useState<{original: string, suggestion: string, reason: string} | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [writeChatInput, setWriteChatInput] = useState('');
  const [editReferences, setEditReferences] = useState({
    useCharacters: true,
    usePlot: true,
    useRelationships: false,
    useWorldElements: true,
    usePastContent: true,
  });
  
  // Write Modal State (Short Story)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [writeSettings, setWriteSettings] = useState({
      instructions: '',
      useCharacters: true,
      usePlot: true,
      useRelationships: false,
      useWorldElements: true,
      useExistingContent: false,
      wordCount: '2000',
      pov: '一人称（私・僕）'
  });

  // Long Story Modal State
  const [isLongStoryModalOpen, setIsLongStoryModalOpen] = useState(false);
  const [isGeneratingLongStory, setIsGeneratingLongStory] = useState(false);
  const [longStorySettings, setLongStorySettings] = useState({
      instructions: '',
      useCharacters: true,
      usePlot: true,
      useRelationships: false,
      useWorldElements: true,
      wordCount: '3000',
      currentEpisode: 1
  });

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

  const aiHighlightExtension = React.useMemo(() => {
    return AiHighlight.configure({
        HTMLAttributes: {
            class: 'ai-highlight',
        },
    })
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch Plot Lists with Cards
  useEffect(() => {
      const fetchPlotLists = async () => {
          const result = await fetchPlotListsForNovel(novel.id);
          if (result.success && result.data) {
              setPlotLists(result.data);
          }
      };
      
      fetchPlotLists();
  }, [novel.id]);

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

  // Get published chapters for long story generation
  const publishedChapters = React.useMemo(() => {
    const chapters: { episodeNumber: number; title: string; wordsCount: number; content: any }[] = [];
    for (const act of acts) {
      for (const chapter of act.chapters) {
        if (chapter.status === 'published' && chapter.episode_number) {
          chapters.push({
            episodeNumber: chapter.episode_number,
            title: chapter.title,
            wordsCount: chapter.words_count || 0,
            content: chapter.content
          });
        }
      }
    }
    return chapters.sort((a, b) => a.episodeNumber - b.episodeNumber);
  }, [acts]);

  // Sync URL with State and State with URL
  useEffect(() => {
    const chapterIdFromUrl = searchParams.get('chapter');
    
    if (chapterIdFromUrl) {
        // URL has chapter ID
        if (chapterIdFromUrl !== activeChapterId) {
             // Check existence
             const exists = acts.some(act => act.chapters.some(c => c.id === chapterIdFromUrl));
             if (exists) {
                 setActiveChapterId(chapterIdFromUrl);
             }
        }
    } else {
        // URL has no chapter ID
        if (activeChapterId) {
            // State has ID -> Update URL (replace to avoid history stack buildup)
            const params = new URLSearchParams(searchParams.toString());
            params.set('chapter', activeChapterId);
            router.replace(`${pathname}?${params.toString()}`);
        } else if (acts.length > 0) {
            // No State, No URL -> Select first chapter
            for (const act of acts) {
                if (act.chapters.length > 0) {
                    const firstChapterId = act.chapters[0].id;
                    setActiveChapterId(firstChapterId);
                    break;
                }
            }
        }
    }
  }, [searchParams, acts, activeChapterId, pathname, router]);

  // Sync title input and word count with active chapter
  useEffect(() => {
    if (activeChapter) {
        setChapterTitle(activeChapter.title);
        setCurrentWordsCount(activeChapter.words_count || 0);
        setChapterStatus(activeChapter.status || 'draft');
        setEpisodeNumber(activeChapter.episode_number ?? null);
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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize(); // Check on initial load
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      IndentOnEnter,
      aiHighlightExtension,
    ],
    content: activeChapter?.content || '',
    editorProps: {
      attributes: {
        class: styles.editor,
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (text) {
          event.preventDefault();
          
          // 改行コードを正規化 (CRLF/CR -> LF)
          // 各行の末尾の空白を削除し、3つ以上の連続する改行を2つに制限
          const cleanedText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n')
            .map(line => line.trimEnd())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');

          view.dispatch(view.state.tr.insertText(cleanedText));
          return true;
        }
        return false;
      },
    },
    onSelectionUpdate: ({ editor }) => {
        const { from, to } = editor.state.selection;
        setSelectionLength(to - from);
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

  // AI Logic
  const toggleAiMode = () => {
    const newMode = !isAiMode;
    setIsAiMode(newMode);
    
    // Reset state when closing, or initialize when opening
    if (newMode) {
       // Do not run proofreading automatically anymore
       // Just ensure tab is set to default
       setAiActiveTab('proofread');
    } else {
        handleCloseAiMode();
    }
  };

  const runProofreading = async () => {
    if (!editor) return;
    
    setIsAiLoading(true);
    editor.commands.unsetAiHighlight();
    setSuggestions([]);

    try {
        const content = editor.getText();
        const result = await proofreadContent(content);

        if (result.success && result.data && result.data.suggestions) {
            const apiSuggestions = result.data.suggestions.map((item: any, index: number) => {
                    let type: Suggestion['type'] = 'typo';
                    let label = '誤字脱字';
                    
                    if (item.type === 'grammar') {
                        type = 'grammar';
                        label = '文法';
                    } else if (item.type === 'style' || item.type === 'expression') {
                        type = 'expression';
                        label = '表現';
                    }

                    return {
                        id: `ai-${index}-${Date.now()}`,
                        type: type,
                        label: label,
                        originalText: item.original,
                        suggestedText: item.suggestion,
                        description: item.reason,
                    };
            });
            
            setSuggestions(apiSuggestions);
            applyHighlights(apiSuggestions);
            setHasProofreadRun(true);
        } else {
            console.error("Failed to fetch suggestions or empty response", result);
            alert("AI添削の取得に失敗しました。");
        }
    } catch (e) {
        console.error("Error in AI mode:", e);
        alert("エラーが発生しました。");
    } finally {
        setIsAiLoading(false);
    }
  };

  const applyHighlights = (items: Suggestion[]) => {
      if (!editor) return;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.isText && node.text) {
            items.forEach(suggestion => {
                let searchPos = 0;
                const text = node.text!;
                while (searchPos < text.length) {
                    const idx = text.indexOf(suggestion.originalText, searchPos);
                    if (idx !== -1) {
                        const from = pos + idx;
                        const to = from + suggestion.originalText.length;
                        editor.chain()
                            .setTextSelection({ from, to })
                            .setAiHighlight({ type: suggestion.type, id: suggestion.id })
                            .run();
                        searchPos = idx + 1;
                    } else {
                        break;
                    }
                }
            });
        }
      });
      editor.commands.setTextSelection(0);
  };

  const handleAcceptSuggestion = (suggestion: Suggestion) => {
      if (!editor) return;
      
      let targetRange: { from: number; to: number } | null = null;
      
      // Find the range of the suggestion mark
      editor.state.doc.descendants((node, pos) => {
          if (targetRange) return false;
          if (node.marks) {
              const mark = node.marks.find(m => m.type.name === 'aiHighlight' && m.attrs.id === suggestion.id);
              if (mark) {
                  targetRange = { from: pos, to: pos + node.nodeSize };
                  return false;
              }
          }
      });

      if (targetRange) {
          editor.chain()
              .focus()
              .setTextSelection(targetRange)
              .unsetAiHighlight() // Remove mark
              .insertContent(suggestion.suggestedText) // Replace text
              .run();
      }
      
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleIgnoreSuggestion = (suggestion: Suggestion) => {
      if (!editor) return;
      
      let targetRange: { from: number; to: number } | null = null;
      
      // Find the range of the suggestion mark
      editor.state.doc.descendants((node, pos) => {
          if (targetRange) return false;
          if (node.marks) {
              const mark = node.marks.find(m => m.type.name === 'aiHighlight' && m.attrs.id === suggestion.id);
              if (mark) {
                  targetRange = { from: pos, to: pos + node.nodeSize };
                  return false;
              }
          }
      });

      if (targetRange) {
          editor.chain()
              .setTextSelection(targetRange)
              .unsetAiHighlight()
              .run();
      }
      
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleAcceptAllSuggestions = () => {
    if (!editor) return;

    const replacements: { from: number; to: number; text: string; id: string }[] = [];

    // 1. Collect all replacement targets from the document
    editor.state.doc.descendants((node, pos) => {
        if (node.marks) {
            const marks = node.marks.filter(m => m.type.name === 'aiHighlight');
            marks.forEach(mark => {
                const suggestion = suggestions.find(s => s.id === mark.attrs.id);
                if (suggestion) {
                    replacements.push({
                        from: pos,
                        to: pos + node.nodeSize,
                        text: suggestion.suggestedText,
                        id: suggestion.id
                    });
                }
            });
        }
    });
    
    // 2. Sort by position descending to avoid index shifting issues
    replacements.sort((a, b) => b.from - a.from);

    // 3. Apply replacements
    if (replacements.length > 0) {
        const chain = editor.chain().focus();
        replacements.forEach(rep => {
             chain.setTextSelection({ from: rep.from, to: rep.to })
                  .unsetAiHighlight()
                  .insertContent(rep.text);
        });
        chain.run();
    }
    
    // 4. Clear suggestions
    setSuggestions([]);
  };

  const handleCloseAiMode = () => {
      setIsAiMode(false);
      setSuggestions([]);
      setHasProofreadRun(false);
      
      // Reset Edit Mode
      setEditResult(null);
      setEditInstruction('');
      setEditTargetRange('selection');
      
      if (editor) {
          editor.commands.unsetAiHighlight();
      }
  };

  const handleGenerateEditSuggestion = async () => {
    if (!editor) return;
    
    // Check if selection is required but empty
    if (editTargetRange === 'selection' && selectionLength === 0) {
        alert("テキストを選択してください。");
        return;
    }

    if (!editInstruction.trim()) {
        alert("指示内容を入力してください。");
        return;
    }

    setIsEditLoading(true);

    try {
        let fullText = editor.getText();
        let selectedText = "";
        let selectionRange = null;

        if (editTargetRange === 'selection') {
            const { from, to } = editor.state.selection;
            selectedText = editor.state.doc.textBetween(from, to);
            selectionRange = { start: from, end: to };
        } else {
            selectedText = fullText;
            selectionRange = { start: 0, end: fullText.length + 1 }; // Simple full range
        }

        const context = {
            chapterTitle: activeChapter?.title || '',
        };

        let enrichmentParams: RewriteEnrichmentParams | undefined;
        if (editTargetRange === 'all') {
            enrichmentParams = {
                novelId: novel.id,
                novelTitle: novel?.title || '',
                novelSynopsis: novel?.synopsis || '',
                novelWorldSetting: novel?.world_setting || undefined,
                references: {
                    useCharacters: editReferences.useCharacters,
                    usePlot: editReferences.usePlot,
                    useRelationships: editReferences.useRelationships,
                    useWorldElements: editReferences.useWorldElements,
                },
                usePastContent: editReferences.usePastContent,
            };
        }

        const result = await rewriteContent(fullText, selectedText, editInstruction, selectionRange, context, enrichmentParams);

        if (result.success && result.data && result.data.result) {
            setEditResult({
                original: result.data.result.originalText || selectedText,
                suggestion: result.data.result.rewrittenText,
                reason: result.data.result.reason
            });
        } else {
             console.error("Failed to generate edit:", result);
             alert("生成に失敗しました。");
        }

    } catch (e) {
        console.error("Error generating edit:", e);
        alert("生成に失敗しました。");
    } finally {
        setIsEditLoading(false);
    }
  };

  const handleApplyEdit = () => {
      if (!editor || !editResult) return;

      if (editTargetRange === 'selection') {
          // Replace selection
          const { from, to } = editor.state.selection;
          editor.chain().focus().insertContentAt({ from, to }, editResult.suggestion).run();
      } else {
          // Replace all
          editor.commands.setContent(editResult.suggestion);
      }
      
      // Reset after apply
      setEditResult(null);
      setEditInstruction('');
  };
  
  const handleEditQuickInstruction = (text: string) => {
      setEditInstruction(text);
  };

  const handleGenerateStoryExecute = async () => {
    setIsGeneratingStory(true);
    try {
      const result = await generateStory({
        novelId: novel.id,
        novelTitle: novel?.title || '未設定',
        novelSynopsis: novel?.synopsis || '未設定',
        novelWorldSetting: novel?.world_setting || undefined,
        references: {
          useCharacters: writeSettings.useCharacters,
          usePlot: writeSettings.usePlot,
          useRelationships: writeSettings.useRelationships,
          useWorldElements: writeSettings.useWorldElements,
        },
        baseContent: writeSettings.useExistingContent ? (editor?.getText() ?? null) : null,
        config: {
          targetLength: parseInt(writeSettings.wordCount) || 2000,
          perspective: writeSettings.pov,
          instruction: writeSettings.instructions,
        },
      });
      
      if (result.success && result.data && result.data.generatedStory) {
        const { title, content, summary, aiComment } = result.data.generatedStory;
        
        // 現在のActに新規チャプターを作成
        let targetActId = acts[0]?.id;
        if (activeChapterId) {
          const foundAct = acts.find(act => act.chapters.some(c => c.id === activeChapterId));
          if (foundAct) targetActId = foundAct.id;
        }

        if (targetActId) {
          const createResult = await createChapter(novel.id, targetActId, title);
          if (createResult.success && createResult.data) {
            const newChapter = createResult.data;
            
            // チャプター内容を更新
            const jsonContent = {
              type: 'doc',
              content: content.split('\n').map((line: string) => ({
                type: 'paragraph',
                content: line ? [{ type: 'text', text: line }] : []
              }))
            };

            await updateChapterContent(newChapter.id, jsonContent, content.length);
            
            // ローカルステート更新と遷移
            setActs(prevActs => prevActs.map(act => {
              if (act.id === targetActId) {
                return {
                  ...act,
                  chapters: [...act.chapters, { ...newChapter, content: jsonContent, words_count: content.length }]
                };
              }
              return act;
            }));
            
            const params = new URLSearchParams(searchParams.toString());
            params.set('chapter', newChapter.id);
            router.push(`${pathname}?${params.toString()}`);
            
            setIsWriteModalOpen(false);
          }
        }
      } else {
        alert("生成に失敗しました。");
      }
    } catch (error) {
      console.error("Generate Story Error:", error);
      alert("エラーが発生しました。");
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // Long Story Generation Handler
  const handleGenerateLongStoryExecute = async () => {
    setIsGeneratingLongStory(true);
    try {
      const extractTextFromContent = (content: unknown): string => {
        if (!content) return '';
        if (typeof content === 'string') return content;
        const doc = content as { type?: string; content?: { type?: string; content?: { text?: string }[] }[] };
        if (doc.type === 'doc' && doc.content) {
          return doc.content
            .map(node => {
              if (node.type === 'paragraph' && node.content) {
                return node.content.map(c => c.text || '').join('');
              }
              return '';
            })
            .join('\n');
        }
        return '';
      };

      const pastContent = publishedChapters.map(ch => ({
        episodeNumber: ch.episodeNumber,
        title: ch.title,
        content: extractTextFromContent(ch.content),
      }));

      const result = await generateLongStory({
        novelId: novel.id,
        novelTitle: novel?.title || '未設定',
        novelSynopsis: novel?.synopsis || '未設定',
        novelWorldSetting: novel?.world_setting || undefined,
        novelPerspective: novel?.perspective || '一人称',
        references: {
          useCharacters: longStorySettings.useCharacters,
          usePlot: longStorySettings.usePlot,
          useRelationships: longStorySettings.useRelationships,
          useWorldElements: longStorySettings.useWorldElements,
        },
        currentEpisode: longStorySettings.currentEpisode,
        pastContent,
        config: {
          targetLength: parseInt(longStorySettings.wordCount) || 3000,
          instruction: longStorySettings.instructions,
        },
      });
      
      if (result.success && result.data && result.data.generatedStory) {
        const { title, content } = result.data.generatedStory;
        
        // 現在のActに新規チャプターを作成
        let targetActId = acts[0]?.id;
        if (activeChapterId) {
          const foundAct = acts.find(act => act.chapters.some(c => c.id === activeChapterId));
          if (foundAct) targetActId = foundAct.id;
        }

        if (targetActId) {
          const chapterTitle = `第${longStorySettings.currentEpisode}話: ${title}`;
          const createResult = await createChapter(novel.id, targetActId, chapterTitle);
          if (createResult.success && createResult.data) {
            const newChapter = createResult.data;
            
            // チャプター内容を更新
            const jsonContent = {
              type: 'doc',
              content: content.split('\n').map((line: string) => ({
                type: 'paragraph',
                content: line ? [{ type: 'text', text: line }] : []
              }))
            };

            await updateChapterContent(newChapter.id, jsonContent, content.length);
            
            // 話数とステータスを設定
            await updateChapterMeta(newChapter.id, novel.id, {
              episode_number: longStorySettings.currentEpisode,
              status: 'draft'
            });
            
            // ローカルステート更新と遷移
            setActs(prevActs => prevActs.map(act => {
              if (act.id === targetActId) {
                return {
                  ...act,
                  chapters: [...act.chapters, { 
                    ...newChapter, 
                    content: jsonContent, 
                    words_count: content.length,
                    episode_number: longStorySettings.currentEpisode,
                    status: 'draft'
                  }]
                };
              }
              return act;
            }));
            
            const params = new URLSearchParams(searchParams.toString());
            params.set('chapter', newChapter.id);
            router.push(`${pathname}?${params.toString()}`);
            
            // 次の話数に更新
            setLongStorySettings(prev => ({
              ...prev,
              currentEpisode: prev.currentEpisode + 1
            }));
            
            setIsLongStoryModalOpen(false);
          }
        }
      } else {
        alert("生成に失敗しました。");
      }
    } catch (error) {
      console.error("Generate Long Story Error:", error);
      alert("エラーが発生しました。");
    } finally {
      setIsGeneratingLongStory(false);
    }
  };

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


  // Helper to handle chapter selection with unsaved check
  const handleChapterSelect = (chapterId: string) => {
      if (chapterId === activeChapterId) return;

      if (saveStatus === 'unsaved') {
        const confirmSwitch = window.confirm('You have unsaved changes. Are you sure you want to switch chapters without saving?');
        if (!confirmSwitch) return;
      }
      
      const params = new URLSearchParams(searchParams.toString());
      params.set('chapter', chapterId);
      router.push(`${pathname}?${params.toString()}`);
      
      // Close sidebar on mobile after selecting chapter
      setIsSidebarOpen(false);
  };

  const handleSave = useCallback(async () => {
    if (!activeChapter || !editor) return;

    setSaveStatus('saving');
    const content = editor.getJSON();
    
    // Calculate word count excluding whitespace for save
    const text = editor.getText();
    const count = text.replace(/\s/g, '').length;

    try {
      // Parallel save: Content and Title
      const promises = [];
      
      // Save content
      promises.push(updateChapterContent(activeChapter.id, content, count));

      // Save title if changed
      if (chapterTitle !== activeChapter.title) {
          promises.push(updateChapterTitle(activeChapter.id, novel.id, chapterTitle));
      }

      // Save meta (status, episode_number) if changed
      const metaChanged = 
        chapterStatus !== activeChapter.status || 
        episodeNumber !== activeChapter.episode_number;
      
      if (metaChanged) {
          promises.push(updateChapterMeta(activeChapter.id, novel.id, {
            status: chapterStatus,
            episode_number: episodeNumber
          }));
      }

      const results = await Promise.all(promises);
      const hasError = results.some(r => r.error);

      if (hasError) {
          console.error('Error saving:', results);
          setSaveStatus('error');
      } else {
          setSaveStatus('saved');
          
          // Show success feedback temporarily
          setShowSaveSuccess(true);
          setTimeout(() => setShowSaveSuccess(false), 2000);
          
          // Update local state to reflect changes
          setActs(prevActs => prevActs.map(act => ({
              ...act,
              chapters: act.chapters.map(ch => 
                  ch.id === activeChapter.id 
                  ? { ...ch, title: chapterTitle, content: content, words_count: count, status: chapterStatus, episode_number: episodeNumber } 
                  : ch
              )
          })));
      }
    } catch (error) {
      console.error('Network error saving:', error);
      setSaveStatus('error');
    }
  }, [activeChapter, editor, chapterTitle, chapterStatus, episodeNumber, novel.id]);

  // Handle keyboard shortcuts (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave]);

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
        const params = new URLSearchParams(searchParams.toString());
        params.set('chapter', newChapter.id);
        router.push(`${pathname}?${params.toString()}`);

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
          const params = new URLSearchParams(searchParams.toString());
          params.delete('chapter');
          router.push(`${pathname}?${params.toString()}`);
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
          const params = new URLSearchParams(searchParams.toString());
          params.delete('chapter');
          router.push(`${pathname}?${params.toString()}`);
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
      if (!editor) return;
      editor.chain().focus().insertContent(text).run();
  };

  const wrapSelection = (startChar: string, endChar: string) => {
      if (!editor) return;
      if (editor.state.selection.empty) {
          editor.chain().focus().insertContent(`${startChar}${endChar}`).setTextSelection(editor.state.selection.from + 1).run();
      } else {
          const { from, to } = editor.state.selection;
          const text = editor.state.doc.textBetween(from, to);
          editor.chain().focus().insertContentAt({ from, to }, `${startChar}${text}${endChar}`).run();
      }
  };

  const insertRuby = () => {
    if (!editor) return;
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
      if (!editor) return;
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

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Mobile Overlay */}
      <div 
        className={`${styles.mobileOverlay} ${isSidebarOpen ? styles.show : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Left Sidebar */}
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        novel={novel}
        handleLinkClick={handleLinkClick}
        handleCreateAct={handleCreateAct}
        isReordering={isReordering}
        setIsReordering={setIsReordering}
        sensors={sensors}
        handleDragOver={handleDragOver}
        handleDragEnd={handleDragEnd}
        acts={acts}
        activeChapterId={activeChapterId}
        handleChapterSelect={handleChapterSelect}
        handleDeleteChapter={handleDeleteChapter}
        handleRenameAct={handleRenameAct}
        handleDeleteAct={handleDeleteAct}
        handleCreateChapter={handleCreateChapter}
      />

      {/* Main Editor Area */}
      <main className={styles.main}>
        {/* Top Toolbar */}
        <Toolbar 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          insertText={insertText}
          wrapSelection={wrapSelection}
          insertRuby={insertRuby}
          isAiMode={isAiMode}
          toggleAiMode={toggleAiMode}
          handleSave={handleSave}
          saveStatus={saveStatus}
        />

        {/* Editor Canvas & AI Panel */}

        {/* Editor Canvas & AI Panel */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <EditorPaper 
              activeChapter={activeChapter}
              chapterTitle={chapterTitle}
              setChapterTitle={setChapterTitle}
              saveStatus={saveStatus}
              setSaveStatus={setSaveStatus}
              isAiMode={isAiMode}
              currentWordsCount={currentWordsCount}
              editor={editor}
              chapterStatus={chapterStatus}
              setChapterStatus={setChapterStatus}
              episodeNumber={episodeNumber}
              setEpisodeNumber={setEpisodeNumber}
            />

            {/* AI Suggestion Panel */}
            {isAiMode && (
                <AiPanel 
                  activeTab={aiActiveTab}
                  setActiveTab={setAiActiveTab}
                  // Proofread
                  isAiLoading={isAiLoading}
                  hasProofreadRun={hasProofreadRun}
                  suggestions={suggestions}
                  runProofreading={runProofreading}
                  handleIgnoreSuggestion={handleIgnoreSuggestion}
                  handleAcceptSuggestion={handleAcceptSuggestion}
                  handleAcceptAllSuggestions={handleAcceptAllSuggestions}
                  // Edit
                  isEditLoading={isEditLoading}
                  editResult={editResult}
                  setEditResult={setEditResult}
                  editTargetRange={editTargetRange}
                  setEditTargetRange={setEditTargetRange}
                  selectionLength={selectionLength}
                  editInstruction={editInstruction}
                  setEditInstruction={setEditInstruction}
                  handleEditQuickInstruction={handleEditQuickInstruction}
                  handleGenerateEditSuggestion={handleGenerateEditSuggestion}
                  handleApplyEdit={handleApplyEdit}
                  editReferences={editReferences}
                  setEditReferences={setEditReferences}
                  publishedChaptersCount={publishedChapters.length}
                  // Write
                  setIsWriteModalOpen={setIsWriteModalOpen}
                  setIsLongStoryModalOpen={setIsLongStoryModalOpen}
                  writeChatInput={writeChatInput}
                  setWriteChatInput={setWriteChatInput}
                />
            )}
        </div>
      </main>

      {/* Write Settings Modal (Short Story) */}
      <WriteSettingsModal 
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        novel={novel}
        writeSettings={writeSettings}
        setWriteSettings={setWriteSettings}
        isGeneratingStory={isGeneratingStory}
        onExecute={handleGenerateStoryExecute}
      />

      {/* Long Story Settings Modal */}
      <LongStorySettingsModal 
        isOpen={isLongStoryModalOpen}
        onClose={() => setIsLongStoryModalOpen(false)}
        novel={novel}
        longStorySettings={longStorySettings}
        setLongStorySettings={setLongStorySettings}
        isGenerating={isGeneratingLongStory}
        onExecute={handleGenerateLongStoryExecute}
        publishedChapters={publishedChapters}
        plotLists={plotLists}
      />

      {/* Mobile Save FAB */}
      <button 
        className={`${styles.saveFab} ${showSaveSuccess ? styles.saveFabSuccess : ''}`}
        onClick={handleSave}
        title="Save"
        disabled={saveStatus === 'saving'}
      >
        <span 
          className={`material-symbols-outlined ${saveStatus === 'saving' ? styles.fabSpinning : ''}`} 
          style={{fontSize: '24px'}}
        >
          {saveStatus === 'saving' ? 'sync' : showSaveSuccess ? 'check_circle' : 'save'}
        </span>
      </button>

    </div>
  );
}
