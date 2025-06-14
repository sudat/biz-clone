/**
 * 仕訳一覧ページ
 * ============================================================================
 * 仕訳の一覧表示・検索・フィルタリング機能を提供
 * ============================================================================
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  JournalSearchForm,
  type JournalSearchParams,
} from "@/components/accounting/journal-search-form";
import { JournalListTable } from "@/components/accounting/journal-list-table";
import {
  getJournals,
  type JournalInquiryData,
} from "@/app/actions/journal-inquiry";
import { toast } from "sonner";

export default function SiwakePage() {
  const [journals, setJournals] = useState<JournalInquiryData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<JournalSearchParams>({});

  const pageSize = 20;

  // 仕訳一覧を取得
  const fetchJournals = useCallback(
    async (params: JournalSearchParams = {}, page: number = 1) => {
      setIsLoading(true);
      try {
        const result = await getJournals({
          page,
          limit: pageSize,
          searchTerm: params.searchTerm,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          // 勘定科目・取引先での絞り込みは明細レベルなので、
          // ここでは基本的な検索のみ実装
        });

        if (result.success && result.data) {
          setJournals(result.data);
          setTotalCount(result.totalCount || 0);
        } else {
          toast.error(result.error || "仕訳一覧の取得に失敗しました");
          setJournals([]);
          setTotalCount(0);
        }
      } catch (error) {
        console.error("仕訳一覧取得エラー:", error);
        toast.error("仕訳一覧の取得に失敗しました");
        setJournals([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 初回読み込み
  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  // 検索処理
  const handleSearch = useCallback(
    (params: JournalSearchParams) => {
      setSearchParams(params);
      setCurrentPage(1);
      fetchJournals(params, 1);
    },
    [fetchJournals]
  );

  // ページ変更処理
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      fetchJournals(searchParams, page);
    },
    [fetchJournals, searchParams]
  );

  // データ更新処理
  const handleRefresh = useCallback(() => {
    fetchJournals(searchParams, currentPage);
  }, [fetchJournals, searchParams, currentPage]);

  return (
    <div className="space-y-4">
      {/* ページヘッダー */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/40 backdrop-blur-sm rounded-xl p-6 shadow-md border">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            仕訳一覧
          </h1>
          <p className="text-muted-foreground">
            仕訳の検索・閲覧・管理を行います
          </p>
        </div>
        <Link href="/siwake/new">
          <Button className="px-6 py-2 shadow-md hover:shadow-lg transition-all duration-300">
            <Plus className="h-4 w-4" />
            仕訳作成
          </Button>
        </Link>
      </div>

      {/* 検索フォーム */}
      <JournalSearchForm onSearch={handleSearch} isSearching={isLoading} />

      {/* 仕訳一覧テーブル */}
      <JournalListTable
        journals={journals}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
