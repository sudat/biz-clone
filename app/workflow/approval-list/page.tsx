"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Edit3 } from "lucide-react";
import { JournalListTable } from "@/components/accounting/journal-list-table";
import { useUser } from "@/lib/contexts/user-context";
import {
  getUserCreatedPendingJournals,
  type JournalInquiryData,
} from "@/app/actions/journal-inquiry";
import { toast } from "sonner";

export default function ApprovalListPage() {
  const { currentUser } = useUser();
  const [createdJournals, setCreatedJournals] = useState<JournalInquiryData[]>(
    []
  );
  const [createdTotalCount, setCreatedTotalCount] = useState(0);
  const [createdCurrentPage, setCreatedCurrentPage] = useState(1);
  const [isLoadingCreated, setIsLoadingCreated] = useState(false);

  const pageSize = 20;

  // 起票した仕訳を取得
  const fetchCreatedJournals = useCallback(
    async (page: number = 1) => {
      if (!currentUser?.userId) return;

      setIsLoadingCreated(true);
      try {
        const result = await getUserCreatedPendingJournals({
          userId: currentUser.userId,
          page,
          limit: pageSize,
        });

        if (result.success && result.data) {
          setCreatedJournals(result.data);
          setCreatedTotalCount(result.totalCount || 0);
        } else {
          toast.error(result.error || "起票した仕訳の取得に失敗しました");
          setCreatedJournals([]);
          setCreatedTotalCount(0);
        }
      } catch (error) {
        console.error("起票した仕訳取得エラー:", error);
        toast.error("起票した仕訳の取得に失敗しました");
        setCreatedJournals([]);
        setCreatedTotalCount(0);
      } finally {
        setIsLoadingCreated(false);
      }
    },
    [currentUser?.userId]
  );

  // 初回読み込み
  useEffect(() => {
    if (currentUser?.userId) {
      fetchCreatedJournals();
    }
  }, [fetchCreatedJournals]);

  // 起票した仕訳のページ変更処理
  const handleCreatedPageChange = useCallback(
    (page: number) => {
      setCreatedCurrentPage(page);
      fetchCreatedJournals(page);
    },
    [fetchCreatedJournals]
  );

  // 起票した仕訳の更新処理
  const handleCreatedRefresh = useCallback(() => {
    fetchCreatedJournals(createdCurrentPage);
  }, [fetchCreatedJournals, createdCurrentPage]);

  return (
    <div className="space-y-4">
      {/* ページヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/40 backdrop-blur-sm rounded-xl p-6 shadow-md border">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            承認対象一覧
          </h1>
          <p className="text-muted-foreground">
            承認が必要な仕訳の確認と処理を行います
          </p>
        </div>
      </div>

      {/* タブコンテンツ */}
      <Tabs defaultValue="created" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger
            value="created"
            className="flex items-center gap-2 text-base"
          >
            <Edit3 className="h-4 w-4" />
            起票した仕訳
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="flex items-center gap-2 text-base"
          >
            <Clock className="h-4 w-4" />
            承認対象の仕訳
          </TabsTrigger>
        </TabsList>

        <TabsContent value="created" className="space-y-4">
          <JournalListTable
            journals={createdJournals}
            totalCount={createdTotalCount}
            currentPage={createdCurrentPage}
            pageSize={pageSize}
            isLoading={isLoadingCreated}
            onPageChange={handleCreatedPageChange}
            onRefresh={handleCreatedRefresh}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              承認対象の仕訳
            </h3>
            <p className="text-muted-foreground">
              あなたの承認が必要な仕訳がここに表示されます
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
