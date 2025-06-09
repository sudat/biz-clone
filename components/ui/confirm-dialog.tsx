"use client";

import React from "react";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmDialogType = "info" | "warning" | "success" | "error";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  type?: ConfirmDialogType;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  destructive?: boolean;
}

const typeConfig = {
  info: {
    icon: Info,
    className: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-yellow-500",
  },
  success: {
    icon: CheckCircle,
    className: "text-green-500",
  },
  error: {
    icon: XCircle,
    className: "text-red-500",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  type = "info",
  confirmLabel = "確認",
  cancelLabel = "キャンセル",
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.className}`} />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// 削除確認ダイアログのヘルパー
export function useDeleteConfirm() {
  const [open, setOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<
    (() => void | Promise<void>) | null
  >(null);

  const confirmDelete = (action: () => void | Promise<void>) => {
    setPendingAction(() => action);
    setOpen(true);
  };

  const handleConfirm = async () => {
    if (pendingAction) {
      await pendingAction();
    }
    setOpen(false);
    setPendingAction(null);
  };

  const handleCancel = () => {
    setOpen(false);
    setPendingAction(null);
  };

  const DeleteConfirmDialog = () => (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      type="warning"
      title="削除の確認"
      description="この操作は元に戻せません。本当に削除しますか？"
      confirmLabel="削除"
      cancelLabel="キャンセル"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      destructive
    />
  );

  return {
    confirmDelete,
    DeleteConfirmDialog,
  };
}
