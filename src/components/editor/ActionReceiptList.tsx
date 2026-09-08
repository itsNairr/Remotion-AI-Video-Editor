'use client';

import { useActionCards } from '@/composables/useActionCards';
import { UseVideoEditorReturn } from '@/composables/useVideoEditor';
import { FileText, RotateCcw } from 'lucide-react';
import React from 'react';
import { ActionCardItem } from './ActionCardItem';

interface ActionReceiptListProps {
  editor: UseVideoEditorReturn;
}

export const ActionReceiptList: React.FC<ActionReceiptListProps> = ({ editor }) => {
  const { actionCards, deleteCard, updateCard, nudgeCard } = useActionCards(editor);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-emerald-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Action Receipt / Applied Edits ({actionCards.length})
          </h2>
        </div>

        <button
          onClick={editor.resetToSample}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 rounded-lg transition"
        >
          <RotateCcw size={12} />
          <span>Reset Sample</span>
        </button>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {actionCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 border-2 border-dashed border-zinc-800 rounded-xl">
            <p className="text-xs text-zinc-500 font-medium">No actions applied yet.</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Ask the AI timeline copilot to add overlays, trim pauses, or punch in!
            </p>
          </div>
        ) : (
          actionCards.map((card) => (
            <ActionCardItem
              key={card.id}
              card={card}
              onDelete={deleteCard}
              onUpdate={updateCard}
              onNudge={nudgeCard}
            />
          ))
        )}
      </div>
    </div>
  );
};
