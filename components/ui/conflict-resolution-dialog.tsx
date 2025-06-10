/**
 * 競合解決ダイアログコンポーネント
 * ============================================================================
 * 複数ユーザーの同時編集時の競合を解決するためのUIコンポーネント
 * ============================================================================
 */

"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, User, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// 競合データ型
interface ConflictData<T> {
  localData: T;
  remoteData: T;
  changedFields: string[];
  conflictId: string;
  timestamp?: string;
  userId?: string;
}

// 解決オプション型
type ResolutionType = 'accept-local' | 'accept-remote' | 'merge';

interface ConflictResolutionDialogProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictData<T>[];
  onResolve: (conflictId: string, resolution: ResolutionType, mergedData?: T) => void;
  entityName?: string;
}

// フィールド値表示コンポーネント
function FieldValueDisplay({ 
  label, 
  localValue, 
  remoteValue, 
  isChanged,
  onSelectLocal,
  onSelectRemote,
  selectedSource
}: {
  label: string;
  localValue: any;
  remoteValue: any;
  isChanged: boolean;
  onSelectLocal?: () => void;
  onSelectRemote?: () => void;
  selectedSource?: 'local' | 'remote';
}) {
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(空)';
    if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <h4 className="text-sm font-medium">{label}</h4>
        {isChanged && (
          <Badge variant="destructive" className="text-xs">
            競合
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* ローカル値 */}
        <Card 
          className={cn(
            "cursor-pointer transition-colors",
            selectedSource === 'local' && "ring-2 ring-blue-500",
            isChanged && onSelectLocal && "hover:bg-blue-50"
          )}
          onClick={isChanged && onSelectLocal ? onSelectLocal : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-blue-600 flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>あなたの変更</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className={cn(
              "text-xs whitespace-pre-wrap break-words",
              !isChanged && "text-muted-foreground"
            )}>
              {formatValue(localValue)}
            </pre>
          </CardContent>
        </Card>

        {/* リモート値 */}
        <Card 
          className={cn(
            "cursor-pointer transition-colors",
            selectedSource === 'remote' && "ring-2 ring-green-500",
            isChanged && onSelectRemote && "hover:bg-green-50"
          )}
          onClick={isChanged && onSelectRemote ? onSelectRemote : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-green-600 flex items-center space-x-1">
              <RefreshCw className="h-3 w-3" />
              <span>他のユーザーの変更</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className={cn(
              "text-xs whitespace-pre-wrap break-words",
              !isChanged && "text-muted-foreground"
            )}>
              {formatValue(remoteValue)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 単一競合解決コンポーネント
function SingleConflictResolver<T>({ 
  conflict, 
  onResolve, 
  entityName = 'データ'
}: {
  conflict: ConflictData<T>;
  onResolve: (resolution: ResolutionType, mergedData?: T) => void;
  entityName?: string;
}) {
  const [resolutionMode, setResolutionMode] = useState<'quick' | 'manual'>('quick');
  const [mergedData, setMergedData] = useState<Record<string, 'local' | 'remote'>>({});

  const { localData, remoteData, changedFields } = conflict;

  // フィールドラベル変換
  const getFieldLabel = (fieldName: string): string => {
    const labelMap: Record<string, string> = {
      accountCode: '勘定科目コード',
      accountName: '勘定科目名',
      accountType: '科目種別',
      partnerCode: '取引先コード',
      partnerName: '取引先名',
      partnerKana: '取引先カナ',
      partnerType: '取引先種別',
      analysisCode: '分析コード',
      analysisName: '分析名',
      analysisType: '分析種別',
      isActive: '有効状態',
      address: '住所',
      phone: '電話番号',
      email: 'メールアドレス',
    };
    return labelMap[fieldName] || fieldName;
  };

  // クイック解決
  const handleQuickResolve = (type: 'local' | 'remote') => {
    onResolve(type === 'local' ? 'accept-local' : 'accept-remote');
  };

  // 手動マージ解決
  const handleManualResolve = () => {
    const merged = { ...localData };
    
    for (const field of changedFields) {
      const selectedSource = mergedData[field] || 'local';
      (merged as any)[field] = selectedSource === 'local' ? (localData as any)[field] : (remoteData as any)[field];
    }
    
    onResolve('merge', merged as T);
  };

  // フィールド選択
  const handleFieldSelect = (field: string, source: 'local' | 'remote') => {
    setMergedData(prev => ({ ...prev, [field]: source }));
  };

  return (
    <div className="space-y-6">
      {/* 概要 */}
      <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            {entityName}の編集競合が発生しました
          </h3>
          <p className="text-xs text-yellow-700 mt-1">
            他のユーザーと同時に編集を行ったため、{changedFields.length}個のフィールドで競合が発生しています。
          </p>
          {conflict.timestamp && (
            <div className="flex items-center space-x-1 mt-2 text-xs text-yellow-600">
              <Clock className="h-3 w-3" />
              <span>{new Date(conflict.timestamp).toLocaleString('ja-JP')}</span>
            </div>
          )}
        </div>
      </div>

      {/* 解決モード選択 */}
      <div className="flex space-x-2">
        <Button
          variant={resolutionMode === 'quick' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setResolutionMode('quick')}
        >
          一括選択
        </Button>
        <Button
          variant={resolutionMode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setResolutionMode('manual')}
        >
          フィールド別選択
        </Button>
      </div>

      {resolutionMode === 'quick' ? (
        /* クイック解決モード */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => handleQuickResolve('local')}
            >
              <div className="text-left">
                <div className="font-medium text-blue-600">あなたの変更を採用</div>
                <div className="text-xs text-muted-foreground mt-1">
                  自分の編集内容をすべて保持します
                </div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => handleQuickResolve('remote')}
            >
              <div className="text-left">
                <div className="font-medium text-green-600">他のユーザーの変更を採用</div>
                <div className="text-xs text-muted-foreground mt-1">
                  他のユーザーの編集内容をすべて保持します
                </div>
              </div>
            </Button>
          </div>
        </div>
      ) : (
        /* 手動解決モード */
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            各フィールドの値をクリックして選択してください。選択された値がマージ結果に反映されます。
          </p>
          
          <ScrollArea className="h-96">
            <div className="space-y-6">
              {changedFields.map((field) => (
                <div key={field}>
                  <FieldValueDisplay
                    label={getFieldLabel(field)}
                    localValue={(localData as any)[field]}
                    remoteValue={(remoteData as any)[field]}
                    isChanged={true}
                    onSelectLocal={() => handleFieldSelect(field, 'local')}
                    onSelectRemote={() => handleFieldSelect(field, 'remote')}
                    selectedSource={mergedData[field] || 'local'}
                  />
                  {field !== changedFields[changedFields.length - 1] && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <Button 
            onClick={handleManualResolve}
            className="w-full"
            disabled={changedFields.some(field => !mergedData[field])}
          >
            選択内容でマージ
          </Button>
        </div>
      )}
    </div>
  );
}

// メインコンポーネント
export function ConflictResolutionDialog<T>({
  isOpen,
  onClose,
  conflicts,
  onResolve,
  entityName = 'データ'
}: ConflictResolutionDialogProps<T>) {
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);

  const currentConflict = conflicts[currentConflictIndex];

  const handleResolve = (resolution: ResolutionType, mergedData?: T) => {
    onResolve(currentConflict.conflictId, resolution, mergedData);
    
    // 次の競合に移動または閉じる
    if (currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(prev => prev + 1);
    } else {
      onClose();
      setCurrentConflictIndex(0);
    }
  };

  if (!currentConflict) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span>編集競合の解決</span>
            {conflicts.length > 1 && (
              <Badge variant="secondary">
                {currentConflictIndex + 1} / {conflicts.length}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            複数のユーザーが同じ{entityName}を編集したため競合が発生しました。
            どちらの変更を採用するか選択してください。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <SingleConflictResolver
            conflict={currentConflict}
            onResolve={handleResolve}
            entityName={entityName}
          />
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {conflicts.length > 1 && `残り ${conflicts.length - currentConflictIndex - 1} 件の競合があります`}
          </div>
          <Button variant="outline" onClick={onClose}>
            後で解決
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictResolutionDialog;