#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 多段階ワークフロー（5ステップ）のテストデータを作成
 */
async function createMultiStepWorkflowTest() {
  try {
    console.log('📋 5ステップワークフローのテストデータ作成を開始...')

    // テスト用組織の作成（既存チェック）
    const testOrganizations = [
      { code: 'T001', name: '申請部署' },
      { code: 'T002', name: '課長承認' },
      { code: 'T003', name: '部長承認' },
      { code: 'T004', name: '経理部確認' },
      { code: 'T005', name: '役員承認' }
    ]

    for (const org of testOrganizations) {
      await prisma.workflowOrganization.upsert({
        where: { organizationCode: org.code },
        update: { organizationName: org.name },
        create: {
          organizationCode: org.code,
          organizationName: org.name,
          description: `テスト用組織: ${org.name}`,
          isActive: true
        }
      })
    }

    // テスト用ワークフロールートの作成
    const testRouteCode = 'TEST-5STEP'
    
    // ReactFlowの設定データ（5ステップフロー）
    const flowConfigJson = {
      "nodes": [
        { "id": "start", "type": "startNode", "position": { "x": 50, "y": 200 }, "data": { "label": "開始" } },
        { "id": "T001", "type": "organizationNode", "position": { "x": 200, "y": 150 }, "data": { "organizationCode": "T001", "organizationName": "申請部署" } },
        { "id": "T002", "type": "organizationNode", "position": { "x": 350, "y": 100 }, "data": { "organizationCode": "T002", "organizationName": "課長承認" } },
        { "id": "T003", "type": "organizationNode", "position": { "x": 500, "y": 150 }, "data": { "organizationCode": "T003", "organizationName": "部長承認" } },
        { "id": "T004", "type": "organizationNode", "position": { "x": 650, "y": 200 }, "data": { "organizationCode": "T004", "organizationName": "経理部確認" } },
        { "id": "T005", "type": "organizationNode", "position": { "x": 800, "y": 150 }, "data": { "organizationCode": "T005", "organizationName": "役員承認" } },
        { "id": "end", "type": "endNode", "position": { "x": 950, "y": 200 }, "data": { "label": "終了" } }
      ],
      "edges": [
        { "id": "e1", "source": "start", "target": "T001", "type": "smoothstep" },
        { "id": "e2", "source": "T001", "target": "T002", "type": "smoothstep" },
        { "id": "e3", "source": "T002", "target": "T003", "type": "smoothstep" },
        { "id": "e4", "source": "T003", "target": "T004", "type": "smoothstep" },
        { "id": "e5", "source": "T004", "target": "T005", "type": "smoothstep" },
        { "id": "e6", "source": "T005", "target": "end", "type": "smoothstep" }
      ]
    }

    await prisma.workflowRoute.upsert({
      where: { routeCode: testRouteCode },
      update: {
        routeName: '5ステップ承認フロー（テスト）',
        description: '申請→課長→部長→経理→役員の5段階承認フロー',
        flowConfigJson: flowConfigJson
      },
      create: {
        routeCode: testRouteCode,
        routeName: '5ステップ承認フロー（テスト）',
        description: '申請→課長→部長→経理→役員の5段階承認フロー',
        flowConfigJson: flowConfigJson,
        isActive: true
      }
    })

    // 既存のステップデータをクリア
    await prisma.workflowRouteStep.deleteMany({
      where: { routeCode: testRouteCode }
    })

    // 5つのステップを順次作成
    const steps = [
      { stepNumber: 1, organizationCode: 'T001', stepName: '申請' },
      { stepNumber: 2, organizationCode: 'T002', stepName: '課長承認' },
      { stepNumber: 3, organizationCode: 'T003', stepName: '部長承認' },
      { stepNumber: 4, organizationCode: 'T004', stepName: '経理確認' },
      { stepNumber: 5, organizationCode: 'T005', stepName: '役員承認' }
    ]

    for (const step of steps) {
      await prisma.workflowRouteStep.create({
        data: {
          routeCode: testRouteCode,
          stepNumber: step.stepNumber,
          organizationCode: step.organizationCode,
          stepName: step.stepName,
          isRequired: true
        }
      })
    }

    console.log('✅ 5ステップワークフローのテストデータ作成が完了しました')

    // 作成されたデータの確認
    const createdSteps = await prisma.workflowRouteStep.findMany({
      where: { routeCode: testRouteCode },
      include: {
        workflowOrganization: true,
        workflowRoute: true
      },
      orderBy: { stepNumber: 'asc' }
    })

    console.log('\n📊 作成された5ステップワークフロー:')
    console.log(`ルート: ${createdSteps[0]?.workflowRoute.routeName} (${testRouteCode})`)
    console.log('ステップ構成:')
    
    createdSteps.forEach(step => {
      console.log(`  ${step.stepNumber}. ${step.stepName} - ${step.workflowOrganization.organizationName} (${step.organizationCode})`)
    })

    // ワークフロー順序の検証
    console.log('\n🔍 ワークフロー順序の検証:')
    console.log('開始 → ' + createdSteps.map(s => s.workflowOrganization.organizationName).join(' → ') + ' → 終了')

    return {
      routeCode: testRouteCode,
      stepCount: createdSteps.length,
      organizations: createdSteps.map(s => s.organizationCode)
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプト実行
createMultiStepWorkflowTest()
  .then(result => {
    console.log(`\n🎉 テスト完了: ${result.stepCount}ステップのワークフロー "${result.routeCode}" を作成しました`)
  })
  .catch(error => {
    console.error('❌ テスト失敗:', error)
    process.exit(1)
  })