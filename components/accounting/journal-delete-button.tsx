/**
 * 仕訳削除ボタンコンポーネント
 * ============================================================================
 * 仕訳削除の確認と実行を行うボタン
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteJournalFromInquiry } from "@/app/actions/journal-inquiry";

interface JournalDeleteButtonProps {
  journalNumber: string;
  journalDescription?: string;
  onDelete?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
}

export function JournalDeleteButton({ 
  journalNumber, 
  journalDescription,
  onDelete,
  variant = "destructive",
  size = "default"
}: JournalDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const result = await deleteJournalFromInquiry(journalNumber);
      
      if (result.success) {
        // 削除成功時は onDelete コールバックを実行、または仕訳一覧ページにリダイレクト
        if (onDelete) {
          onDelete();
        } else {
          router.push("/siwake");
        }
      } else {
        alert(`削除に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除処理中にエラーが発生しました");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={isDeleting}>
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "削除中..." : "削除"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>仕訳の削除</AlertDialogTitle>
          <AlertDialogDescription>
            以下の仕訳を削除しますか？この操作は取り消せません。
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="font-mono text-sm">
                仕訳番号: {journalNumber}
              </div>
              {journalDescription && (
                <div className="text-sm mt-1">
                  摘要: {journalDescription}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? "削除中..." : "削除する"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}