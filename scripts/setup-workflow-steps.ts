#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * K-001ワークフロールートのステップ情報をworkflow_route_stepsテーブルに登録
 */
async function setupWorkflowSteps() {
  try {
    console.log('K-001ワークフロールートのステップ設定を開始...')

    // K-001のワークフロールートが存在するか確認
    const workflowRoute = await prisma.workflowRoute.findUnique({
      where: { routeCode: 'K-001' }
    })

    if (!workflowRoute) {
      console.error('K-001ワークフロールートが見つかりません')
      return
    }

    // 既存のステップデータをクリア（再実行時の重複防止）
    await prisma.workflowRouteStep.deleteMany({
      where: { routeCode: 'K-001' }
    })

    // ステップ1: 経理部（申請者）K001
    await prisma.workflowRouteStep.create({
      data: {
        routeCode: 'K-001',
        stepNumber: 1,
        organizationCode: 'K001',
        stepName: '申請',
        isRequired: true
      }
    })

    // ステップ2: 経理部（承認者）K002  
    await prisma.workflowRouteStep.create({
      data: {
        routeCode: 'K-001',
        stepNumber: 2,
        organizationCode: 'K002',
        stepName: '承認',
        isRequired: true
      }
    })

    console.log('✅ K-001ワークフロールートのステップ設定が完了しました')

    // 設定内容を確認表示
    const steps = await prisma.workflowRouteStep.findMany({
      where: { routeCode: 'K-001' },
      include: {
        workflowOrganization: true
      },
      orderBy: { stepNumber: 'asc' }
    })

    console.log('\n📊 設定されたワークフローステップ:')
    steps.forEach(step => {
      console.log(`  ステップ${step.stepNumber}: ${step.stepName} - ${step.workflowOrganization.organizationName} (${step.organizationCode})`)
    })

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプト実行
setupWorkflowSteps()