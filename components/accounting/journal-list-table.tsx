/**
 * 仕訳一覧テーブルコンポーネント
 * ============================================================================
 * 仕訳データの一覧表示・ページネーション機能
 * ============================================================================
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JournalDeleteButton } from "@/components/accounting/journal-delete-button";
import { AmountDisplay } from "@/components/accounting/amount-display";
import type { JournalInquiryData } from "@/app/actions/journal-inquiry";

interface JournalListTableProps {
  journals: JournalInquiryData[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export function JournalListTable({
  journals,
  totalCount,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
  onRefresh,
}: JournalListTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    const endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const formatJournalDate = (date: Date) => {
    return format(date, "yyyy/MM/dd", { locale: ja });
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>仕訳一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">検索中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (journals.length === 0) {
    return (
      <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>仕訳一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
              <Eye className="h-8 w-8 opacity-50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">仕訳が見つかりません</h3>
            <p className="text-sm">検索条件を変更して再度お試しください</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">
          仕訳一覧 ({totalCount.toLocaleString()}件)
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          更新
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* デスクトップ表示 */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">仕訳番号</TableHead>
                <TableHead className="w-28">仕訳日</TableHead>
                <TableHead>摘要</TableHead>
                <TableHead className="w-32 text-right">金額</TableHead>
                <TableHead className="w-28">作成日</TableHead>
                <TableHead className="w-32 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journals.map((journal) => (
                <TableRow
                  key={journal.journalNumber}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => window.open(`/siwake/${journal.journalNumber}`, '_blank')}
                >
                  <TableCell className="font-mono">
                    {journal.journalNumber}
                  </TableCell>
                  <TableCell>
                    {formatJournalDate(journal.journalDate)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md truncate">
                      {journal.description || "摘要未入力"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono">
                      ¥{journal.totalAmount.toLocaleString('ja-JP')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatJournalDate(journal.createdAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/siwake/${journal.journalNumber}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/siwake/update/${journal.journalNumber}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <JournalDeleteButton
                        journalNumber={journal.journalNumber}
                        onDelete={onRefresh}
                        variant="ghost"
                        size="sm"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* モバイル表示 */}
        <div className="md:hidden space-y-3 p-4">
          {journals.map((journal) => (
            <Card 
              key={journal.journalNumber}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => window.open(`/siwake/${journal.journalNumber}`, '_blank')}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono">{journal.journalNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatJournalDate(journal.journalDate)}
                    </p>
                  </div>
                  <span className="font-mono text-sm">
                    ¥{journal.totalAmount.toLocaleString('ja-JP')}
                  </span>
                </div>
                
                <p className="text-sm mb-3 truncate">
                  {journal.description || "摘要未入力"}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    作成: {formatJournalDate(journal.createdAt)}
                  </span>
                  <div 
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href={`/siwake/${journal.journalNumber}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/siwake/update/${journal.journalNumber}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <JournalDeleteButton
                      journalNumber={journal.journalNumber}
                      onDelete={onRefresh}
                      variant="ghost"
                      size="sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalCount.toLocaleString()}件中 {((currentPage - 1) * pageSize + 1).toLocaleString()}-{Math.min(currentPage * pageSize, totalCount).toLocaleString()}件を表示
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              前へ
            </Button>
            
            <div className="flex gap-1">
              {getPageNumbers().map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage}
            >
              次へ
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}