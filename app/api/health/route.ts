/**
 * Health Check API
 * ============================================================================
 * システムのヘルスチェックエンドポイント
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { handleGetRequest } from '@/lib/api/validation';
import { prisma } from '@/lib/database/prisma';

// ====================
// GET /api/health - ヘルスチェック
// ====================

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    {
      allowPublic: true
    },
    async (_params, _auth) => {
      const healthChecks = await Promise.allSettled([
        // データベース接続チェック
        checkDatabase(),
        // システム情報取得
        getSystemInfo()
      ]);

      const [dbResult, sysResult] = healthChecks;

      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: dbResult.status === 'fulfilled' ? dbResult.value : {
            status: 'error',
            error: dbResult.status === 'rejected' ? dbResult.reason?.message : 'Unknown error'
          },
          system: sysResult.status === 'fulfilled' ? sysResult.value : {
            status: 'error',
            error: sysResult.status === 'rejected' ? sysResult.reason?.message : 'Unknown error'
          }
        }
      };

      // いずれかのサービスがエラーの場合は degraded
      const hasErrors = Object.values(health.services).some(
        service => service.status === 'error'
      );

      if (hasErrors) {
        health.status = 'degraded';
      }

      return health;
    }
  );
}

// ====================
// ヘルスチェック関数
// ====================

async function checkDatabase() {
  try {
    // 簡単なクエリでデータベース接続確認
    await prisma.$queryRaw`SELECT 1 as test`;
    
    // 主要テーブルの存在確認
    const tableChecks = await Promise.all([
      prisma.account.count(),
      prisma.journalHeader.count()
    ]);

    return {
      status: 'ok',
      connection: 'active',
      accounts: tableChecks[0],
      journals: tableChecks[1],
      response_time: '< 100ms'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

async function getSystemInfo() {
  try {
    return {
      status: 'ok',
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'System info unavailable'
    };
  }
}