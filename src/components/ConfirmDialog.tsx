interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-5 ring-1 ring-line">
        <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
        <p className="mt-2 text-[13px] text-muted-ink">{message}</p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl text-[13px] font-medium text-muted-ink ring-1 ring-line"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-11 flex-1 rounded-xl bg-withdraw font-display text-[14px] font-semibold text-paper"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
