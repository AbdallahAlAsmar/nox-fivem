'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const variantStyles = {
    danger: {
      border: 'border-[rgba(239,68,68,0.3)]',
      confirm: 'bg-[#ef4444] hover:bg-[#dc2626] text-white',
      icon: 'text-[#ef4444]',
      bg: 'bg-[rgba(239,68,68,0.05)]',
    },
    warning: {
      border: 'border-[rgba(245,158,11,0.3)]',
      confirm: 'bg-[#f59e0b] hover:bg-[#d97706] text-black',
      icon: 'text-[#f59e0b]',
      bg: 'bg-[rgba(245,158,11,0.05)]',
    },
    info: {
      border: 'border-[rgba(94,106,210,0.3)]',
      confirm: 'bg-[#5E6AD2] hover:bg-[#4f5bc0] text-white',
      icon: 'text-[#5E6AD2]',
      bg: 'bg-[rgba(94,106,210,0.05)]',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50"
          >
            <div className={`bg-[#16161E] ${styles.border} p-5 rounded-lg shadow-2xl`}>
              <div className={`w-10 h-10 rounded-full ${styles.bg} flex items-center justify-center mx-auto mb-4`}>
                <AlertCircle className={`w-5 h-5 ${styles.icon}`} />
              </div>
              <h3 className="font-mono text-sm text-white text-center mb-2">{title}</h3>
              <p className="font-sans text-xs text-white/50 text-center mb-5 leading-relaxed">{message}</p>
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 font-mono text-xs uppercase tracking-wider transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className={`flex-1 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 ${styles.confirm}`}
                >
                  {isConfirming ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing
                    </span>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => Promise<void> | void;
    variant: 'danger' | 'warning' | 'info';
  } | null>(null);

  const confirm = useCallback((opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => Promise<void> | void;
    variant?: 'danger' | 'warning' | 'info';
  }) => {
    setDialog({
      ...opts,
      confirmText: opts.confirmText || 'Confirm',
      cancelText: opts.cancelText || 'Cancel',
      variant: opts.variant || 'danger',
    });
  }, []);

  const close = useCallback(() => setDialog(null), []);

  return { dialog, confirm, close };
}