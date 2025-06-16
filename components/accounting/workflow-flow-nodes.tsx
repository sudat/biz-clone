"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

// 始点ノード（StartNode）- 緑色の丸形
export function StartNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`relative w-16 h-16 rounded-full bg-green-500 border-4 shadow-lg flex items-center justify-center ${
        selected ? "border-green-700" : "border-green-400"
      }`}
    >
      <div className="text-white font-bold text-xs">開始</div>
      
      {/* 出力ハンドルのみ（下側） */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-green-600 border-2 border-white"
      />
    </div>
  );
}

// 終点ノード（EndNode）- 赤色の丸形
export function EndNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`relative w-16 h-16 rounded-full bg-red-500 border-4 shadow-lg flex items-center justify-center ${
        selected ? "border-red-700" : "border-red-400"
      }`}
    >
      <div className="text-white font-bold text-xs">終了</div>
      
      {/* 入力ハンドルのみ（上側） */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-red-600 border-2 border-white"
      />
    </div>
  );
}

// 組織ノード（OrganizationNode）- 青色の矩形、組織名表示
export function OrganizationNode({ data, selected }: NodeProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(data.id);
    }
  };

  return (
    <div
      className={`relative px-4 py-3 shadow-md rounded-lg border-2 bg-blue-50 min-w-[180px] ${
        selected ? "border-blue-600" : "border-blue-300"
      }`}
    >
      {/* 入力ハンドル（上側） */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-blue-600 border-2 border-white"
      />
      
      <div className="text-center">
        <div className="font-semibold text-sm text-blue-800">
          {data.organizationName}
        </div>
        <div className="text-xs text-blue-600 mt-1">
          {data.organizationCode}
        </div>
        {data.stepNumber && (
          <Badge variant="secondary" className="mt-2 text-xs bg-blue-100 text-blue-700">
            ステップ {data.stepNumber}
          </Badge>
        )}
      </div>

      {/* 削除ボタン（削除可能な場合のみ表示） */}
      {data.deletable !== false && (
        <Button
          onClick={handleDelete}
          variant="ghost"
          size="sm"
          className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}

      {/* 出力ハンドル（下側） */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-blue-600 border-2 border-white"
      />
    </div>
  );
}

// ノードタイプの定義と登録
export const workflowNodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  organizationNode: OrganizationNode,
};

// ノードのデフォルトデータ型定義
export interface StartNodeData {
  label?: string;
}

export interface EndNodeData {
  label?: string;
}

export interface OrganizationNodeData {
  id: string;
  organizationCode: string;
  organizationName: string;
  stepNumber?: number;
  deletable?: boolean;
  onDelete?: (nodeId: string) => void;
}

// ヘルパー関数：始点ノードを作成
export function createStartNode(position: { x: number; y: number }) {
  return {
    id: 'start-node',
    type: 'startNode',
    position,
    data: {
      label: '開始'
    },
    deletable: false,
  };
}

// ヘルパー関数：終点ノードを作成
export function createEndNode(position: { x: number; y: number }) {
  return {
    id: 'end-node',
    type: 'endNode',
    position,
    data: {
      label: '終了'
    },
    deletable: false,
  };
}

// ヘルパー関数：組織ノードを作成
export function createOrganizationNode(
  id: string,
  organizationCode: string,
  organizationName: string,
  position: { x: number; y: number },
  stepNumber?: number,
  onDelete?: (nodeId: string) => void
) {
  return {
    id,
    type: 'organizationNode',
    position,
    data: {
      id,
      organizationCode,
      organizationName,
      stepNumber,
      deletable: true,
      onDelete,
    } as OrganizationNodeData,
  };
}