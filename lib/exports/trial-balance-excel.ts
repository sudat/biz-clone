/**
 * 試算表Excel出力機能
 * ============================================================================
 * ExcelJSを使用した試算表のExcel出力
 * ============================================================================
 */

import ExcelJS from "exceljs";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { TrialBalanceData } from "@/app/actions/trial-balance";

export interface TrialBalanceExcelOptions {
  data: TrialBalanceData[];
  dateFrom: Date;
  dateTo: Date;
  companyName?: string;
  includeZeroBalance: boolean;
  includeSubAccounts: boolean;
}

/**
 * 試算表をExcel出力する
 */
export async function generateTrialBalanceExcel(
  options: TrialBalanceExcelOptions,
): Promise<void> {
  const {
    data,
    dateFrom,
    dateTo,
    companyName = "株式会社サンプル",
    includeZeroBalance,
    includeSubAccounts,
  } = options;

  try {
    // ワークブック作成
    const workbook = new ExcelJS.Workbook();
    workbook.creator = companyName;
    workbook.created = new Date();

    // ワークシート作成
    const worksheet = workbook.addWorksheet("試算表", {
      pageSetup: {
        paperSize: 9, // A4
        orientation: "portrait",
        margins: {
          left: 0.7,
          right: 0.7,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    let currentRow = 1;

    // タイトル行
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = "試算表";
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow += 1;

    // 会社名
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const companyCell = worksheet.getCell(`A${currentRow}`);
    companyCell.value = companyName;
    companyCell.font = { size: 12, bold: true };
    companyCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow += 1;

    // 期間
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const periodCell = worksheet.getCell(`A${currentRow}`);
    periodCell.value = `期間: ${
      format(dateFrom, "yyyy年MM月dd日", { locale: ja })
    } ～ ${format(dateTo, "yyyy年MM月dd日", { locale: ja })}`;
    periodCell.font = { size: 10 };
    periodCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow += 1;

    // 条件
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const conditionCell = worksheet.getCell(`A${currentRow}`);
    conditionCell.value = `条件: 残高ゼロ科目${
      includeZeroBalance ? "含む" : "除く"
    }, 補助科目${includeSubAccounts ? "含む" : "除く"}`;
    conditionCell.font = { size: 9 };
    conditionCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow += 2; // 空行

    // ヘッダー行
    const headers = [
      "科目コード",
      "科目名",
      "補助コード",
      "補助科目名",
      "期首残高",
      "借方計上額",
      "貸方計上額",
      "期末残高",
    ];

    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6E6FA" }, // 薄紫色
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    currentRow += 1;

    // データ行
    let totalOpeningBalance = 0;
    let totalDebitAmount = 0;
    let totalCreditAmount = 0;
    let totalClosingBalance = 0;

    data.forEach((item) => {
      const dataRow = worksheet.getRow(currentRow);

      // 科目コード
      const codeCell = dataRow.getCell(1);
      codeCell.value = item.accountCode;
      codeCell.alignment = { horizontal: "left", vertical: "middle" };

      // 科目名（階層表示のためのインデント）
      const nameCell = dataRow.getCell(2);
      const indent = "  ".repeat(item.level); // レベルに応じてインデント
      nameCell.value = indent + item.accountName;
      nameCell.alignment = { horizontal: "left", vertical: "middle" };

      // 補助コード
      const subCodeCell = dataRow.getCell(3);
      subCodeCell.value = item.subAccountCode || "";
      subCodeCell.alignment = { horizontal: "left", vertical: "middle" };

      // 補助科目名
      const subNameCell = dataRow.getCell(4);
      subNameCell.value = item.subAccountName || "";
      subNameCell.alignment = { horizontal: "left", vertical: "middle" };

      // 金額セル（数値として設定）
      const openingCell = dataRow.getCell(5);
      openingCell.value = item.openingBalance;
      openingCell.numFmt = "#,##0;[Red]-#,##0";
      openingCell.alignment = { horizontal: "right", vertical: "middle" };

      const debitCell = dataRow.getCell(6);
      debitCell.value = item.debitAmount;
      debitCell.numFmt = "#,##0;[Red]-#,##0";
      debitCell.alignment = { horizontal: "right", vertical: "middle" };

      const creditCell = dataRow.getCell(7);
      creditCell.value = item.creditAmount;
      creditCell.numFmt = "#,##0;[Red]-#,##0";
      creditCell.alignment = { horizontal: "right", vertical: "middle" };

      const closingCell = dataRow.getCell(8);
      closingCell.value = item.closingBalance;
      closingCell.numFmt = "#,##0;[Red]-#,##0";
      closingCell.alignment = { horizontal: "right", vertical: "middle" };

      // 罫線設定
      for (let col = 1; col <= 8; col++) {
        const cell = dataRow.getCell(col);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }

      // 合計計算
      totalOpeningBalance += item.openingBalance;
      totalDebitAmount += item.debitAmount;
      totalCreditAmount += item.creditAmount;
      totalClosingBalance += item.closingBalance;

      currentRow += 1;
    });

    // 合計行
    const totalRow = worksheet.getRow(currentRow);

    // 「合計」ラベル
    const totalLabelCell = totalRow.getCell(2);
    totalLabelCell.value = "合計";
    totalLabelCell.font = { bold: true };
    totalLabelCell.alignment = { horizontal: "center", vertical: "middle" };

    // 合計値
    const totalOpeningCell = totalRow.getCell(5);
    totalOpeningCell.value = totalOpeningBalance;
    totalOpeningCell.numFmt = "#,##0;[Red]-#,##0";
    totalOpeningCell.font = { bold: true };
    totalOpeningCell.alignment = { horizontal: "right", vertical: "middle" };

    const totalDebitCell = totalRow.getCell(6);
    totalDebitCell.value = totalDebitAmount;
    totalDebitCell.numFmt = "#,##0;[Red]-#,##0";
    totalDebitCell.font = { bold: true };
    totalDebitCell.alignment = { horizontal: "right", vertical: "middle" };

    const totalCreditCell = totalRow.getCell(7);
    totalCreditCell.value = totalCreditAmount;
    totalCreditCell.numFmt = "#,##0;[Red]-#,##0";
    totalCreditCell.font = { bold: true };
    totalCreditCell.alignment = { horizontal: "right", vertical: "middle" };

    const totalClosingCell = totalRow.getCell(8);
    totalClosingCell.value = totalClosingBalance;
    totalClosingCell.numFmt = "#,##0;[Red]-#,##0";
    totalClosingCell.font = { bold: true };
    totalClosingCell.alignment = { horizontal: "right", vertical: "middle" };

    // 合計行の罫線（太線）
    for (let col = 1; col <= 8; col++) {
      const cell = totalRow.getCell(col);
      cell.border = {
        top: { style: "thick" },
        left: { style: "thin" },
        bottom: { style: "thick" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F8FF" }, // 薄青色
      };
    }

    // 列幅設定
    worksheet.getColumn(1).width = 12; // 科目コード
    worksheet.getColumn(2).width = 25; // 科目名
    worksheet.getColumn(3).width = 12; // 補助コード
    worksheet.getColumn(4).width = 20; // 補助科目名
    worksheet.getColumn(5).width = 15; // 期首残高
    worksheet.getColumn(6).width = 15; // 借方計上額
    worksheet.getColumn(7).width = 15; // 貸方計上額
    worksheet.getColumn(8).width = 15; // 期末残高

    // フィルター設定
    worksheet.autoFilter = {
      from: { row: 6, column: 1 }, // ヘッダー行
      to: { row: currentRow - 1, column: 8 }, // データ最終行
    };

    // ファイル名生成
    const fromStr = format(dateFrom, "yyyyMMdd", { locale: ja });
    const toStr = format(dateTo, "yyyyMMdd", { locale: ja });
    const filename = `試算表_${fromStr}-${toStr}_${
      format(new Date(), "yyyyMMdd_HHmmss", { locale: ja })
    }.xlsx`;

    // Excel出力
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // ダウンロード
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Excel出力エラー:", error);
    throw new Error("Excel出力中にエラーが発生しました");
  }
}
