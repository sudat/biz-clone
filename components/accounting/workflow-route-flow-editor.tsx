"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, RotateCcw, AlignHorizontalJustifyStart } from "lucide-react";
import { WorkflowOrganizationForClient } from "@/app/actions/workflow-organizations";

// 始点ノードコンポーネント
function StartNode({ selected }: NodeProps) {
  return (
    <div
      className={`px-6 py-4 shadow-md rounded-full border-2 bg-white min-w-[120px] ${
        selected ? "border-blue-500" : "border-gray-300"
      }`}
    >
      <div className="text-center">
        <div className="font-bold text-sm text-gray-800">開始</div>
        <div className="text-xs text-gray-600">START</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4"
      />
    </div>
  );
}

// 終点ノードコンポーネント
function EndNode({ selected }: NodeProps) {
  return (
    <div
      className={`px-6 py-4 shadow-md rounded-full border-2 bg-white min-w-[120px] ${
        selected ? "border-blue-500" : "border-gray-300"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4"
      />
      <div className="text-center">
        <div className="font-bold text-sm text-gray-800">終了</div>
        <div className="text-xs text-gray-600">END</div>
      </div>
    </div>
  );
}

// ワークフロー組織ノードのデータ型
interface WorkflowOrganizationNodeData {
  organizationName: string;
  organizationCode: string;
  stepNumber?: number;
}

// ワークフロー組織ノードコンポーネント
function WorkflowOrganizationNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowOrganizationNodeData;
  return (
    <div
      className={`px-4 py-3 shadow-md rounded-lg border-2 bg-white min-w-[180px] ${
        selected ? "border-blue-500" : "border-gray-300"
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3" />

      <div className="text-center">
        <div className="font-semibold text-sm text-gray-800">
          {nodeData.organizationName}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {nodeData.organizationCode}
        </div>
        {nodeData.stepNumber && (
          <Badge variant="secondary" className="mt-2 text-xs">
            ステップ {nodeData.stepNumber}
          </Badge>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  );
}

// カスタムノード種類
const nodeTypes = {
  start: StartNode,
  end: EndNode,
  workflowOrganization: WorkflowOrganizationNode,
};

// デフォルトノード（始点・終点）
const defaultNodes: Node[] = [
  {
    id: "start",
    type: "start",
    position: { x: 50, y: 200 },
    data: {},
    draggable: true,
  },
  {
    id: "end",
    type: "end",
    position: { x: 700, y: 200 },
    data: {},
    draggable: true,
  },
];

interface WorkflowRouteFlowEditorProps {
  organizations: WorkflowOrganizationForClient[];
  initialFlowConfig?: {
    nodes: Node[];
    edges: Edge[];
    viewport?: { x: number; y: number; zoom: number };
  };
  onSave: (flowConfig: {
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  }) => void;
  saving?: boolean;
}

export function WorkflowRouteFlowEditor({
  organizations,
  initialFlowConfig,
  onSave,
  saving = false,
}: WorkflowRouteFlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlowConfig?.nodes.length ? initialFlowConfig.nodes : defaultNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialFlowConfig?.edges || []
  );
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [nextStepNumber, setNextStepNumber] = useState(1);

  // 初期化
  useEffect(() => {
    if (initialFlowConfig?.nodes.length) {
      setNodes(initialFlowConfig.nodes);
      // 既存のエッジに矢印スタイルを適用
      const edgesWithArrows = (initialFlowConfig.edges || []).map(edge => ({
        ...edge,
        markerEnd: {
          type: 'arrowclosed',
          color: '#6366f1',
        },
        style: { strokeWidth: 2, stroke: '#6366f1' },
      }));
      setEdges(edgesWithArrows);
    } else {
      setNodes(defaultNodes);
      setEdges([]);
    }
    setSelectedOrganization("");
    setNextStepNumber(1);
  }, [initialFlowConfig, setNodes, setEdges]);

  // エッジ接続時のハンドラー
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({
        ...params,
        markerEnd: {
          type: 'arrowclosed',
          color: '#6366f1',
        },
        style: { strokeWidth: 2, stroke: '#6366f1' },
      }, eds));
    },
    [setEdges]
  );

  // 新しいノードを追加
  const addOrganizationNode = useCallback(() => {
    if (!selectedOrganization) return;

    const organization = organizations.find(
      (org) => org.organizationCode === selectedOrganization
    );
    if (!organization) return;

    // 既に追加済みかチェック
    const existingNode = nodes.find(
      (node) => node.data.organizationCode === selectedOrganization
    );
    if (existingNode) return;

    const newNode: Node = {
      id: `org-${selectedOrganization}`,
      type: "workflowOrganization",
      position: {
        x: Math.random() * 500 + 300,
        y: Math.random() * 100 + 150,
      },
      data: {
        organizationCode: organization.organizationCode,
        organizationName: organization.organizationName,
        stepNumber: nextStepNumber,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setNextStepNumber((prev) => prev + 1);
    setSelectedOrganization("");
  }, [nodes, setNodes, selectedOrganization, organizations, nextStepNumber]);

  // ノードを削除（始点・終点は削除不可）
  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(
      (node) => node.selected && node.id !== "start" && node.id !== "end"
    );
    const selectedNodeIds = selectedNodes.map((node) => node.id);

    if (selectedNodeIds.length === 0) return;

    // ノードを削除
    setNodes((nds) => nds.filter((node) => !selectedNodeIds.includes(node.id)));

    // 関連するエッジも削除
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !selectedNodeIds.includes(edge.source) &&
          !selectedNodeIds.includes(edge.target)
      )
    );
  }, [nodes, setNodes, setEdges]);

  // フローをリセット
  const resetFlow = useCallback(() => {
    setNodes(defaultNodes);
    setEdges([]);
    setNextStepNumber(1);
  }, [setNodes, setEdges]);

  // ノード整列処理
  const alignNodes = useCallback(() => {
    const startNode = nodes.find(node => node.id === 'start');
    const endNode = nodes.find(node => node.id === 'end');
    const orgNodes = nodes.filter(node => 
      node.type === 'workflowOrganization'
    ).sort((a, b) => {
      // ステップ番号でソート
      const stepA = a.data.stepNumber || 0;
      const stepB = b.data.stepNumber || 0;
      return stepA - stepB;
    });

    if (!startNode || !endNode) return;

    // ノードの高さ定義（中央揃えのため）
    const nodeHeights = {
      start: 48,           // px-6 py-4 の高さ
      end: 48,             // px-6 py-4 の高さ
      workflowOrganization: 54  // px-4 py-3 + Badge の高さ
    };

    // ノードの幅定義（gap計算のため）
    const nodeWidths = {
      start: 120,          // min-w-[120px]
      end: 120,            // min-w-[120px]
      workflowOrganization: 180  // min-w-[180px]
    };

    // 中央揃えの基準Y座標
    const centerY = 200;
    
    // X座標の配置計算（等間隔gap）
    const gap = 50; // ノード間の隙間
    const startX = 50; // 開始X座標
    
    // 全ノードを順序通りに配列
    const orderedNodes = [startNode, ...orgNodes, endNode];

    const updatedNodes = nodes.map(node => {
      let nodeY = centerY;
      let nodeX = startX;
      
      // ノードタイプに応じて中央揃えのY座標を計算
      if (node.id === 'start' || node.id === 'end') {
        nodeY = centerY - nodeHeights.start / 2;
      } else if (node.type === 'workflowOrganization') {
        nodeY = centerY - nodeHeights.workflowOrganization / 2;
      }

      // X座標の計算（等間隔gap）
      const nodeIndex = orderedNodes.findIndex(n => n.id === node.id);
      if (nodeIndex >= 0) {
        // 前のノードまでの累積幅とgapを計算
        let accumulatedWidth = startX;
        for (let i = 0; i < nodeIndex; i++) {
          const prevNode = orderedNodes[i];
          if (prevNode.id === 'start' || prevNode.id === 'end') {
            accumulatedWidth += nodeWidths.start + gap;
          } else if (prevNode.type === 'workflowOrganization') {
            accumulatedWidth += nodeWidths.workflowOrganization + gap;
          }
        }
        nodeX = accumulatedWidth;
      }

      return { ...node, position: { x: nodeX, y: nodeY } };
    });

    setNodes(updatedNodes);
  }, [nodes, setNodes]);

  // 保存処理
  const handleSave = useCallback(() => {
    onSave({
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 },
    });
  }, [nodes, edges, onSave]);

  return (
    <div className="flex flex-col h-[calc(100vh-300px)] min-h-[600px]">
      {/* コントロールパネル */}
      <div className="p-4 border-b bg-gray-50 space-y-4 shrink-0">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="organization-select">組織を追加</Label>
            <select
              id="organization-select"
              value={selectedOrganization}
              onChange={(e) => setSelectedOrganization(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">-- 組織を選択 --</option>
              {organizations
                .filter((org) => org.isActive)
                .filter(
                  (org) =>
                    !nodes.some(
                      (node) =>
                        node.data.organizationCode === org.organizationCode
                    )
                )
                .map((org) => (
                  <option
                    key={org.organizationCode}
                    value={org.organizationCode}
                  >
                    {org.organizationName} ({org.organizationCode})
                  </option>
                ))}
            </select>
          </div>
          <Button
            onClick={addOrganizationNode}
            disabled={!selectedOrganization}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            追加
          </Button>
        </div>

        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
            <Button
              onClick={deleteSelectedNodes}
              variant="destructive"
              size="sm"
              disabled={
                !nodes.some(
                  (node) =>
                    node.selected && node.id !== "start" && node.id !== "end"
                )
              }
            >
              <Trash2 className="w-4 h-4 mr-2" />
              選択削除
            </Button>
            <Button onClick={alignNodes} variant="outline" size="sm">
              <AlignHorizontalJustifyStart className="w-4 h-4 mr-2" />
              整列
            </Button>
            <Button onClick={resetFlow} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              リセット
            </Button>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>• 組織ノードをドラッグして位置を調整できます</p>
          <p>
            • ノードの左右のハンドルをドラッグして承認フローを作成できます（左から右へのフロー）
          </p>
          <p>• 組織ノードをクリックして選択後、削除ボタンで削除できます</p>
          <p>• 整列ボタンで全ノードを横一列に等間隔で配置できます</p>
          <p>• 開始・終了ノードは削除できません</p>
        </div>
      </div>

      {/* ReactFlow エディター */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gradient-to-br from-blue-50 to-indigo-50"
          style={{ zIndex: 1 }}
        >
          <Controls />
          <MiniMap
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.8)",
            }}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#e2e8f0"
          />
        </ReactFlow>
      </div>
    </div>
  );
}