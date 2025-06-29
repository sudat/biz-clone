/**
 * MCP Tools List API
 * ============================================================================
 * 利用可能なMCPツール一覧提供エンドポイント
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { handleGetRequest } from '@/lib/api/validation';

// ====================
// GET /api/mcp/tools - 利用可能ツール一覧
// ====================

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    {
      requiredScopes: ['mcp:read']
    },
    async (params, auth) => {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      
      return {
        tools: [
          // 仕訳ツール
          {
            name: 'save_journal',
            description: '新しい仕訳を保存します',
            category: 'journal',
            method: 'POST',
            endpoint: `${baseUrl}/api/journal`,
            input_schema: {
              type: 'object',
              properties: {
                header: {
                  type: 'object',
                  properties: {
                    journalDate: { type: 'string', description: '計上日 (YYYY-MM-DD形式)' },
                    description: { type: 'string', description: '摘要' }
                  },
                  required: ['journalDate']
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      debitCredit: { type: 'string', enum: ['debit', 'credit'] },
                      accountCode: { type: 'string' },
                      baseAmount: { type: 'number' },
                      taxAmount: { type: 'number' },
                      totalAmount: { type: 'number' }
                    },
                    required: ['debitCredit', 'accountCode', 'baseAmount', 'taxAmount', 'totalAmount']
                  },
                  minItems: 2
                }
              },
              required: ['header', 'details']
            }
          },
          {
            name: 'search_journals',
            description: '仕訳を検索します',
            category: 'journal',
            method: 'GET',
            endpoint: `${baseUrl}/api/journal`,
            input_schema: {
              type: 'object',
              properties: {
                searchTerm: { type: 'string' },
                fromDate: { type: 'string' },
                toDate: { type: 'string' },
                page: { type: 'number', default: 1 },
                limit: { type: 'number', default: 20 }
              }
            }
          },
          {
            name: 'update_journal',
            description: '既存の仕訳を更新します',
            category: 'journal',
            method: 'PUT',
            endpoint: `${baseUrl}/api/journal/[journalNumber]`
          },
          {
            name: 'delete_journal',
            description: '仕訳を削除します',
            category: 'journal',
            method: 'DELETE',
            endpoint: `${baseUrl}/api/journal/[journalNumber]`
          },

          // マスタデータツール
          {
            name: 'create_account',
            description: '勘定科目を作成します',
            category: 'master',
            method: 'POST',
            endpoint: `${baseUrl}/api/master/accounts`
          },
          {
            name: 'search_accounts',
            description: '勘定科目を検索します',
            category: 'master',
            method: 'GET',
            endpoint: `${baseUrl}/api/master/accounts`
          },
          {
            name: 'create_partner',
            description: '取引先を作成します',
            category: 'master',
            method: 'POST',
            endpoint: `${baseUrl}/api/master/partners`
          },
          {
            name: 'search_partners',
            description: '取引先を検索します',
            category: 'master',
            method: 'GET',
            endpoint: `${baseUrl}/api/master/partners`
          },
          {
            name: 'create_department',
            description: '部門を作成します',
            category: 'master',
            method: 'POST',
            endpoint: `${baseUrl}/api/master/departments`
          },
          {
            name: 'search_departments',
            description: '部門を検索します',
            category: 'master',
            method: 'GET',
            endpoint: `${baseUrl}/api/master/departments`
          },
          {
            name: 'create_analysis_code',
            description: '分析コードを作成します',
            category: 'master',
            method: 'POST',
            endpoint: `${baseUrl}/api/master/analysis-codes`
          },
          {
            name: 'search_analysis_codes',
            description: '分析コードを検索します',
            category: 'master',
            method: 'GET',
            endpoint: `${baseUrl}/api/master/analysis-codes`
          },

          // 検索・分析ツール
          {
            name: 'unified_search',
            description: '全データを横断検索します',
            category: 'search',
            method: 'GET',
            endpoint: `${baseUrl}/api/search/unified`
          },
          {
            name: 'get_trial_balance',
            description: '試算表を取得します',
            category: 'reports',
            method: 'GET',
            endpoint: `${baseUrl}/api/reports/trial-balance`
          },
          {
            name: 'get_journal_summary',
            description: '仕訳集計を取得します',
            category: 'reports',
            method: 'GET',
            endpoint: `${baseUrl}/api/reports/journal-summary`
          }
        ],
        categories: [
          'journal',    // 仕訳関連
          'master',     // マスタデータ関連
          'search',     // 検索関連
          'reports'     // レポート関連
        ],
        authentication: {
          type: 'Bearer',
          scopes: ['mcp:read', 'mcp:write', 'mcp:admin']
        },
        base_url: baseUrl,
        version: '1.0.0'
      };
    }
  );
}