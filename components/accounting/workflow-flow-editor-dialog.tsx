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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, X } from "lucide-react";
import { WorkflowOrganizationForClient } from "@/app/actions/workflow-organizations";

// 始点ノードコンポーネント
function StartNode({ selected }: NodeProps) {
  return (
    <div
      className={`px-6 py-4 shadow-md rounded-full border-2 bg-green-100 min-w-[120px] ${
        selected ? "border-green-600" : "border-green-400"
      }`}
    >
      <div className="text-center">
        <div className="font-bold text-sm text-green-800">開始</div>
        <div className="text-xs text-green-600">START</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-4 h-4 bg-green-500"
      />
    </div>
  );
}

// 終点ノードコンポーネント
function EndNode({ selected }: NodeProps) {
  return (
    <div
      className={`px-6 py-4 shadow-md rounded-full border-2 bg-red-100 min-w-[120px] ${
        selected ? "border-red-600" : "border-red-400"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 bg-red-500"
      />
      <div className="text-center">
        <div className="font-bold text-sm text-red-800">終了</div>
        <div className="text-xs text-red-600">END</div>
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
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

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

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
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
    position: { x: 400, y: 50 },
    data: {},
    draggable: true,
  },
  {
    id: "end",
    type: "end",
    position: { x: 400, y: 500 },
    data: {},
    draggable: true,
  },
];

interface WorkflowFlowEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
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
  title?: string;
}

export function WorkflowFlowEditorDialog({
  isOpen,
  onClose,
  organizations,
  initialFlowConfig,
  onSave,
  title = "承認フロー設定",
}: WorkflowFlowEditorDialogProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlowConfig?.nodes.length ? initialFlowConfig.nodes : defaultNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialFlowConfig?.edges || []
  );
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [nextStepNumber, setNextStepNumber] = useState(1);

  // ダイアログが開かれた時の初期化
  useEffect(() => {
    if (isOpen) {
      if (initialFlowConfig?.nodes.length) {
        setNodes(initialFlowConfig.nodes);
        setEdges(initialFlowConfig.edges || []);
      } else {
        setNodes(defaultNodes);
        setEdges([]);
      }
      setSelectedOrganization("");
      setNextStepNumber(1);
    }
  }, [isOpen, initialFlowConfig, setNodes, setEdges]);

  // エッジ接続時のハンドラー
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
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
        x: Math.random() * 400 + 200,
        y: Math.random() * 200 + 200,
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

  // 保存処理
  const handleSave = useCallback(() => {
    onSave({
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    onClose();
  }, [nodes, edges, onSave, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none p-0 gap-0 min-w-[800px] min-h-[600px] sm:min-w-[320px] sm:min-h-[400px]"
        style={{ width: "90vw", height: "90vh" }}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
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
              <Button onClick={resetFlow} variant="outline" size="sm">
                リセット
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>• 組織ノードをドラッグして位置を調整できます</p>
              <p>
                • ノードの上下のハンドルをドラッグして承認フローを作成できます
              </p>
              <p>• 組織ノードをクリックして選択後、削除ボタンで削除できます</p>
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

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
