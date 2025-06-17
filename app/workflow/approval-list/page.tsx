"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Edit3, CheckCircle2 } from "lucide-react";
import { JournalListTable } from "@/components/accounting/journal-list-table";
import { useUser } from "@/lib/contexts/user-context";
import {
  getUserCreatedPendingJournals,
  getApprovableJournals,
  getApprovedJournalsByUser,
  type JournalInquiryData,
} from "@/app/actions/journal-inquiry";
import { toast } from "sonner";

export default function ApprovalListPage() {
  const { currentUser } = useUser();

  // 起票した仕訳のstate
  const [createdJournals, setCreatedJournals] = useState<JournalInquiryData[]>(
    []
  );
  const [createdTotalCount, setCreatedTotalCount] = useState(0);
  const [createdCurrentPage, setCreatedCurrentPage] = useState(1);
  const [isLoadingCreated, setIsLoadingCreated] = useState(false);

  // 承認対象の仕訳のstate
  const [approvableJournals, setApprovableJournals] = useState<
    JournalInquiryData[]
  >([]);
  const [approvableTotalCount, setApprovableTotalCount] = useState(0);
  const [approvableCurrentPage, setApprovableCurrentPage] = useState(1);
  const [isLoadingApprovable, setIsLoadingApprovable] = useState(false);

  // 承認済の仕訳のstate
  const [approvedJournals, setApprovedJournals] = useState<
    JournalInquiryData[]
  >([]);
  const [approvedTotalCount, setApprovedTotalCount] = useState(0);
  const [approvedCurrentPage, setApprovedCurrentPage] = useState(1);
  const [isLoadingApproved, setIsLoadingApproved] = useState(false);

  // 起票した仕訳の読み込み
  const loadCreatedJournals = useCallback(
    async (page: number = 1) => {
      if (!currentUser?.userId) return;

      setIsLoadingCreated(true);
      try {
        const result = await getUserCreatedPendingJournals({
          userId: currentUser.userId,
          page,
          limit: 20,
        });

        if (result.success) {
          setCreatedJournals(result.data || []);
          setCreatedTotalCount(result.totalCount || 0);
          setCreatedCurrentPage(page);
        } else {
          toast.error("起票した仕訳の取得に失敗しました: " + result.error);
        }
      } catch (error) {
        toast.error("起票した仕訳の取得エラー");
        console.error("起票した仕訳取得エラー:", error);
      } finally {
        setIsLoadingCreated(false);
      }
    },
    [currentUser?.userId]
  );

  // 承認対象の仕訳の読み込み
  const loadApprovableJournals = useCallback(
    async (page: number = 1) => {
      if (!currentUser?.userId) return;

      setIsLoadingApprovable(true);
      try {
        const result = await getApprovableJournals({
          userId: currentUser.userId,
          page,
          limit: 20,
        });

        if (result.success) {
          setApprovableJournals(result.data || []);
          setApprovableTotalCount(result.totalCount || 0);
          setApprovableCurrentPage(page);
        } else {
          toast.error("承認対象仕訳の取得に失敗しました: " + result.error);
        }
      } catch (error) {
        toast.error("承認対象仕訳の取得エラー");
        console.error("承認対象仕訳取得エラー:", error);
      } finally {
        setIsLoadingApprovable(false);
      }
    },
    [currentUser?.userId]
  );

  // 承認済の仕訳の読み込み
  const loadApprovedJournals = useCallback(
    async (page: number = 1) => {
      if (!currentUser?.userId) return;

      setIsLoadingApproved(true);
      try {
        const result = await getApprovedJournalsByUser({
          userId: currentUser.userId,
          page,
          limit: 20,
        });

        if (result.success) {
          setApprovedJournals(result.data || []);
          setApprovedTotalCount(result.totalCount || 0);
          setApprovedCurrentPage(page);
        } else {
          toast.error("承認済仕訳の取得に失敗しました: " + result.error);
        }
      } catch (error) {
        toast.error("承認済仕訳の取得エラー");
        console.error("承認済仕訳取得エラー:", error);
      } finally {
        setIsLoadingApproved(false);
      }
    },
    [currentUser?.userId]
  );

  // 初期読み込み
  useEffect(() => {
    if (currentUser?.userId) {
      loadCreatedJournals();
      loadApprovableJournals();
      loadApprovedJournals();
    }
  }, [
    currentUser?.userId,
    loadCreatedJournals,
    loadApprovableJournals,
    loadApprovedJournals,
  ]);

  // ページネーション処理
  const handleCreatedPageChange = (page: number) => {
    loadCreatedJournals(page);
  };

  const handleApprovablePageChange = (page: number) => {
    loadApprovableJournals(page);
  };

  const handleApprovedPageChange = (page: number) => {
    loadApprovedJournals(page);
  };

  // 更新処理
  const handleRefreshCreated = () => {
    loadCreatedJournals(createdCurrentPage);
  };

  const handleRefreshApprovable = () => {
    loadApprovableJournals(approvableCurrentPage);
  };

  const handleRefreshApproved = () => {
    loadApprovedJournals(approvedCurrentPage);
  };

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
        <TabsList className="grid w-full grid-cols-3 mb-0 items-center justify-center h-12">
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
          <TabsTrigger
            value="approved"
            className="flex items-center gap-2 text-base"
          >
            <CheckCircle2 className="h-4 w-4" />
            承認済の仕訳
          </TabsTrigger>
        </TabsList>

        <TabsContent value="created" className="space-y-4">
          <JournalListTable
            journals={createdJournals}
            isLoading={isLoadingCreated}
            totalCount={createdTotalCount}
            currentPage={createdCurrentPage}
            pageSize={20}
            onPageChange={handleCreatedPageChange}
            onRefresh={handleRefreshCreated}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <JournalListTable
            journals={approvableJournals}
            isLoading={isLoadingApprovable}
            totalCount={approvableTotalCount}
            currentPage={approvableCurrentPage}
            pageSize={20}
            onPageChange={handleApprovablePageChange}
            onRefresh={handleRefreshApprovable}
          />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <JournalListTable
            journals={approvedJournals}
            isLoading={isLoadingApproved}
            totalCount={approvedTotalCount}
            currentPage={approvedCurrentPage}
            pageSize={20}
            onPageChange={handleApprovedPageChange}
            onRefresh={handleRefreshApproved}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
