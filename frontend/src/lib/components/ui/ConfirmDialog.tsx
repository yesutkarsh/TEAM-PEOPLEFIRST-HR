/** Confirmation modal with focus trap, Escape close, and pending state. */
import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { Button, type ButtonVariant } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
}

const variantToButton: Record<NonNullable<ConfirmDialogProps["variant"]>, ButtonVariant> = {
  danger: "danger",
  warning: "primary",
  default: "primary",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const cancel = () => {
    if (pending) return;
    onCancel?.();
    onOpenChange(false);
  };

  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={cancel} title={title} className="max-w-md">
      <p className="text-[14px] text-[#6B6B6B] leading-relaxed">{description}</p>
      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={cancel} disabled={pending}>{cancelLabel}</Button>
        <Button ref={confirmRef} variant={variantToButton[variant]} onClick={confirm} loading={pending}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
