import React from 'react';
import styles from '../edit.module.css';
import { ProofreadTab, Suggestion } from './ProofreadTab';
import { EditTab } from './EditTab';
import { WriteTab } from './WriteTab';

type AiPanelProps = {
  activeTab: 'proofread' | 'edit' | 'write';
  setActiveTab: (tab: 'proofread' | 'edit' | 'write') => void;
  // Proofread Props
  isAiLoading: boolean;
  hasProofreadRun: boolean;
  suggestions: Suggestion[];
  runProofreading: () => Promise<void>;
  handleIgnoreSuggestion: (suggestion: Suggestion) => void;
  handleAcceptSuggestion: (suggestion: Suggestion) => void;
  handleAcceptAllSuggestions: () => void;
  // Edit Props
  isEditLoading: boolean;
  editResult: { original: string; suggestion: string; reason: string } | null;
  setEditResult: (result: any) => void;
  editTargetRange: 'selection' | 'all';
  setEditTargetRange: (range: 'selection' | 'all') => void;
  selectionLength: number;
  editInstruction: string;
  setEditInstruction: (instruction: string) => void;
  handleEditQuickInstruction: (text: string) => void;
  handleGenerateEditSuggestion: () => Promise<void>;
  handleApplyEdit: () => void;
  // Write Props
  setIsWriteModalOpen: (isOpen: boolean) => void;
  writeChatInput: string;
  setWriteChatInput: (input: string) => void;
};

export const AiPanel = ({
  activeTab,
  setActiveTab,
  // Proofread
  isAiLoading,
  hasProofreadRun,
  suggestions,
  runProofreading,
  handleIgnoreSuggestion,
  handleAcceptSuggestion,
  handleAcceptAllSuggestions,
  // Edit
  isEditLoading,
  editResult,
  setEditResult,
  editTargetRange,
  setEditTargetRange,
  selectionLength,
  editInstruction,
  setEditInstruction,
  handleEditQuickInstruction,
  handleGenerateEditSuggestion,
  handleApplyEdit,
  // Write
  setIsWriteModalOpen,
  writeChatInput,
  setWriteChatInput,
}: AiPanelProps) => {
  return (
    <aside className={styles.suggestionPanel}>
      <div className={styles.aiTabs}>
        {[
          { id: 'proofread', label: '校正', icon: 'search' },
          { id: 'edit', label: '編集', icon: 'auto_fix' },
          { id: 'write', label: '執筆', icon: 'edit' },
        ].map(tab => (
          <div 
            key={tab.id}
            className={`${styles.aiTab} ${activeTab === tab.id ? styles.aiTabActive : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{tab.icon}</span>
            {tab.label}
          </div>
        ))}
      </div>

      <div className={styles.aiTabContent}>
        {activeTab === 'proofread' && (
          <ProofreadTab 
            isAiLoading={isAiLoading}
            hasProofreadRun={hasProofreadRun}
            suggestions={suggestions}
            runProofreading={runProofreading}
            handleIgnoreSuggestion={handleIgnoreSuggestion}
            handleAcceptSuggestion={handleAcceptSuggestion}
            handleAcceptAllSuggestions={handleAcceptAllSuggestions}
          />
        )}
        {activeTab === 'edit' && (
          <EditTab 
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
          />
        )}
        {activeTab === 'write' && (
          <WriteTab 
            setIsWriteModalOpen={setIsWriteModalOpen}
            writeChatInput={writeChatInput}
            setWriteChatInput={setWriteChatInput}
          />
        )}
      </div>
    </aside>
  );
};
