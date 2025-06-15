/**
 * Role Select Dialog Component
 * ============================================================================
 * Dialog for selecting roles with ability to add new roles
 * ============================================================================
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, Check, ChevronDown, ChevronUp, Plus } from "lucide-react";

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

import { getAllRoles, type MasterSearchResult } from "@/app/actions/master-search";
import { createRole } from "@/app/actions/roles";
import { showErrorToast, showSuccessToast } from "@/components/ui/error-toast";
import { createSystemError } from "@/lib/types/errors";

interface RoleSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (code: string, name: string) => void;
  selectedCode?: string;
}

// Safe Japanese text constants
const ROLE_TEXTS = {
  label: "ロール",
  searchPlaceholder: "ロールのコードまたは名称で検索...",
  emptyMessage: "ロールが登録されていません",
  addNewRole: "+ 新しいロールを追加",
  addRoleTitle: "新しいロール追加",
  roleCode: "ロールコード",
  roleName: "ロール名",
  description: "説明",
  required: "必須",
  optional: "省略可",
  cancel: "キャンセル",
  add: "追加",
  adding: "追加中...",
} as const;

const COMMON_TEXTS = {
  select: "選択",
  selected: "選択中",
  search: "検索",
  loading: "読み込み中...",
  noResults: "検索結果がありません",
  code: "コード",
  name: "名称",
  selectFrom: "から選択してください",
  itemsOf: "件の",
  itemsFrom: "件中"
} as const;

export function RoleSelectDialog({
  open,
  onOpenChange,
  onSelect,
  selectedCode
}: RoleSelectDialogProps) {
  const [allData, setAllData] = useState<MasterSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<'code' | 'name'>('code');
  
  // New role addition states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Fetch data when dialog opens
  const fetchData = async () => {
    if (!open) return;

    setIsLoading(true);
    try {
      const data = await getAllRoles();
      setAllData(data);
    } catch (error) {
      console.error(`Error fetching ${ROLE_TEXTS.label}:`, error);
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
      setShowAddForm(false);
      setNewRoleCode("");
      setNewRoleName("");
      setNewRoleDescription("");
    }
  }, [open]);

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

  // Handle new role addition
  const handleAddNewRole = async () => {
    if (!newRoleCode.trim() || !newRoleName.trim()) {
      showErrorToast(createSystemError("ロールコードとロール名は必須です", "入力エラー"));
      return;
    }

    setIsAdding(true);
    try {
      const formData = new FormData();
      formData.append('roleCode', newRoleCode.trim());
      formData.append('roleName', newRoleName.trim());
      if (newRoleDescription.trim()) {
        formData.append('description', newRoleDescription.trim());
      }

      const result = await createRole(formData);
      
      if (result.success) {
        showSuccessToast(`ロール「${newRoleName}」を追加しました`);
        
        // Update the data list
        const newRoleData: MasterSearchResult = {
          code: newRoleCode.trim(),
          name: newRoleName.trim(),
          type: 'role'
        };
        setAllData(prev => [...prev, newRoleData]);
        
        // Auto-select the new role
        onSelect(newRoleCode.trim(), newRoleName.trim());
        
        // Reset form and close
        setNewRoleCode("");
        setNewRoleName("");
        setNewRoleDescription("");
        setShowAddForm(false);
        onOpenChange(false);
      } else {
        showErrorToast(result.error || createSystemError("ロールの追加に失敗しました", "ロール追加"));
      }
    } catch (error) {
      console.error("ロール追加エラー:", error);
      showErrorToast(createSystemError("ロールの追加に失敗しました", "ネットワークエラー"));
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancelAddRole = () => {
    setNewRoleCode("");
    setNewRoleName("");
    setNewRoleDescription("");
    setShowAddForm(false);
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
            {ROLE_TEXTS.label}{COMMON_TEXTS.selectFrom}
          </DialogTitle>
          <DialogDescription>
            {ROLE_TEXTS.label}{COMMON_TEXTS.selectFrom}
          </DialogDescription>
        </DialogHeader>

        {!showAddForm ? (
          <>
            {/* Search area */}
            <div className="space-y-2">
              <Label htmlFor="search-input">{COMMON_TEXTS.search}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder={ROLE_TEXTS.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            {/* Add new role button */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {ROLE_TEXTS.addNewRole}
              </Button>
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
                        {searchQuery ? COMMON_TEXTS.noResults : ROLE_TEXTS.emptyMessage}
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
                  {filteredData.length}{COMMON_TEXTS.itemsOf}{ROLE_TEXTS.label}
                  {searchQuery && ` (${allData.length}{COMMON_TEXTS.itemsFrom})`}
                </>
              )}
            </div>
          </>
        ) : (
          /* Add new role form */
          <div className="space-y-4">
            <div className="text-lg font-semibold">{ROLE_TEXTS.addRoleTitle}</div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="new-role-code" className="text-sm font-medium">
                  {ROLE_TEXTS.roleCode} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-role-code"
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="例: ADMIN"
                  disabled={isAdding}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="new-role-name" className="text-sm font-medium">
                  {ROLE_TEXTS.roleName} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-role-name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="例: 管理者"
                  disabled={isAdding}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="new-role-description" className="text-sm font-medium">
                  {ROLE_TEXTS.description} ({ROLE_TEXTS.optional})
                </Label>
                <Input
                  id="new-role-description"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="例: システム管理者権限"
                  disabled={isAdding}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelAddRole}
                disabled={isAdding}
              >
                {ROLE_TEXTS.cancel}
              </Button>
              <Button
                type="button"
                onClick={handleAddNewRole}
                disabled={isAdding || !newRoleCode.trim() || !newRoleName.trim()}
              >
                {isAdding ? ROLE_TEXTS.adding : ROLE_TEXTS.add}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}