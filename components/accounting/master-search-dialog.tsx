/**
 * Master Search Dialog Component
 * ============================================================================
 * Dialog for searching and selecting master data
 * ============================================================================
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getAllAccounts,
  getAllSubAccounts,
  getAllPartners,
  getAllAnalysisCodes,
  type MasterSearchResult
} from "@/app/actions/master-search";

interface MasterSearchDialogProps {
  type: 'account' | 'subAccount' | 'partner' | 'analysisCode';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (code: string, name: string) => void;
  parentCode?: string;
  selectedCode?: string;
  className?: string;
}

// Safe Japanese text constants
const MASTER_TYPES = {
  account: {
    label: "\u52d8\u5b9a\u79d1\u76ee",
    searchPlaceholder: "\u52d8\u5b9a\u79d1\u76ee\u306e\u30b3\u30fc\u30c9\u307e\u305f\u306f\u540d\u79f0\u3067\u691c\u7d22...",
    emptyMessage: "\u52d8\u5b9a\u79d1\u76ee\u304c\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093"
  },
  subAccount: {
    label: "\u88dc\u52a9\u79d1\u76ee",
    searchPlaceholder: "\u88dc\u52a9\u79d1\u76ee\u306e\u30b3\u30fc\u30c9\u307e\u305f\u306f\u540d\u79f0\u3067\u691c\u7d22...",
    emptyMessage: "\u88dc\u52a9\u79d1\u76ee\u304c\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093"
  },
  partner: {
    label: "\u53d6\u5f15\u5148",
    searchPlaceholder: "\u53d6\u5f15\u5148\u306e\u30b3\u30fc\u30c9\u307e\u305f\u306f\u540d\u79f0\u3067\u691c\u7d22...",
    emptyMessage: "\u53d6\u5f15\u5148\u304c\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093"
  },
  analysisCode: {
    label: "\u5206\u6790\u30b3\u30fc\u30c9",
    searchPlaceholder: "\u5206\u6790\u30b3\u30fc\u30c9\u306e\u30b3\u30fc\u30c9\u307e\u305f\u306f\u540d\u79f0\u3067\u691c\u7d22...",
    emptyMessage: "\u5206\u6790\u30b3\u30fc\u30c9\u304c\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093"
  }
} as const;

const COMMON_TEXTS = {
  select: "\u9078\u629e",
  selected: "\u9078\u629e\u4e2d",
  search: "\u691c\u7d22",
  loading: "\u8aad\u307f\u8fbc\u307f\u4e2d...",
  noResults: "\u691c\u7d22\u7d50\u679c\u304c\u3042\u308a\u307e\u305b\u3093",
  code: "\u30b3\u30fc\u30c9",
  name: "\u540d\u79f0",
  selectFrom: "\u304b\u3089\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044",
  parentAccount: "\u89aa\u52d8\u5b9a\u79d1\u76ee",
  itemsOf: "\u4ef6\u306e",
  itemsFrom: "\u4ef6\u4e2d"
} as const;

export function MasterSearchDialog({
  type,
  open,
  onOpenChange,
  onSelect,
  parentCode,
  selectedCode,
  className
}: MasterSearchDialogProps) {
  const [allData, setAllData] = useState<MasterSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<'code' | 'name'>('code');

  const typeConfig = MASTER_TYPES[type];

  // Fetch data when dialog opens
  const fetchData = async () => {
    if (!open) return;

    setIsLoading(true);
    try {
      let data: MasterSearchResult[] = [];

      switch (type) {
        case 'account':
          data = await getAllAccounts();
          break;
        case 'subAccount':
          if (parentCode) {
            data = await getAllSubAccounts(parentCode);
          }
          break;
        case 'partner':
          data = await getAllPartners();
          break;
        case 'analysisCode':
          data = await getAllAnalysisCodes();
          break;
      }

      setAllData(data);
    } catch (error) {
      console.error(`Error fetching ${typeConfig.label}:`, error);
      setAllData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      fetchData();
      setSearchQuery("");
    }
  }, [open, type, parentCode]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = allData;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = sortField === 'code' ? a.code : a.name;
      const bValue = sortField === 'code' ? b.code : b.name;
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filtered;
  }, [allData, searchQuery, sortField, sortDirection]);

  // Handle sort toggle
  const handleSort = (field: 'code' | 'name') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle item selection
  const handleSelect = (item: MasterSearchResult) => {
    onSelect(item.code, item.name);
    onOpenChange(false);
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: 'code' | 'name' }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[70vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            {typeConfig.label}{COMMON_TEXTS.selectFrom}
          </DialogTitle>
          <DialogDescription>
            {type === 'subAccount' && parentCode && (
              <>{COMMON_TEXTS.parentAccount}: {parentCode} {COMMON_TEXTS.selectFrom}</>
            )}
            {type !== 'subAccount' && (
              <>{typeConfig.label}{COMMON_TEXTS.selectFrom}</>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Search area */}
        <div className="space-y-2">
          <Label htmlFor="search-input">{COMMON_TEXTS.search}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-input"
              placeholder={typeConfig.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Table area */}
        <div>
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[200px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('code')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      <div className="flex items-center gap-1">
                        {COMMON_TEXTS.code}
                        <SortIcon field="code" />
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('name')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      <div className="flex items-center gap-1">
                        {COMMON_TEXTS.name}
                        <SortIcon field="name" />
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">{COMMON_TEXTS.select}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      {COMMON_TEXTS.loading}
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? COMMON_TEXTS.noResults : typeConfig.emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow 
                      key={item.code}
                      className={cn(
                        "hover:bg-muted/50 cursor-pointer",
                        selectedCode === item.code && "bg-blue-50 border-blue-200"
                      )}
                      onClick={() => handleSelect(item)}
                    >
                      <TableCell className="font-mono font-medium">
                        {item.code}
                      </TableCell>
                      <TableCell>
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(item);
                          }}
                          className="h-8"
                        >
                          {selectedCode === item.code ? (
                            <>
                              <Check className="h-4 w-4" />
                              {COMMON_TEXTS.selected}
                            </>
                          ) : (
                            COMMON_TEXTS.select
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t text-xs text-muted-foreground text-center">
          {filteredData.length > 0 && (
            <>
              {filteredData.length}{COMMON_TEXTS.itemsOf}{typeConfig.label}
              {searchQuery && ` (${allData.length}{COMMON_TEXTS.itemsFrom})`}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}