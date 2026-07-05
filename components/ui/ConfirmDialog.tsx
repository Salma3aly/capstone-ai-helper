"use client";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Yes, continue", cancelLabel = "Cancel", onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <button onClick={onCancel} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium text-white bg-[#ec4899] rounded-lg hover:bg-[#db2777] transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
