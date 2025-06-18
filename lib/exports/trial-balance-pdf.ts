/**
 * 試算表PDF出力機能
 * ============================================================================
 * jsPDFとhtml2canvasを使用した試算表のPDF出力
 * ============================================================================
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { TrialBalanceData } from "@/app/actions/trial-balance";
import { loadJapaneseFont } from "@/lib/utils/load-jspdf-japanese-font";

export interface TrialBalancePdfOptions {
  data: TrialBalanceData[];
  dateFrom: Date;
  dateTo: Date;
  companyName?: string;
  includeZeroBalance: boolean;
  includeSubAccounts: boolean;
}

/**
 * 試算表をPDF出力する
 */
export async function generateTrialBalancePdf(
  options: TrialBalancePdfOptions,
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
    // PDF設定
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // 日本語フォント読み込み
    await loadJapaneseFont(pdf);

    pdf.setFont("SawarabiGothic", "normal");

    let yPosition = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;

    // ヘッダー情報
    pdf.setFontSize(16);
    pdf.text("試算表", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.text(companyName, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    pdf.setFontSize(10);
    const periodText = `期間: ${
      format(dateFrom, "yyyy年MM月dd日", { locale: ja })
    } ～ ${format(dateTo, "yyyy年MM月dd日", { locale: ja })}`;
    pdf.text(periodText, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    const conditionsText = `条件: 残高ゼロ科目${
      includeZeroBalance ? "含む" : "除く"
    }, 補助科目${includeSubAccounts ? "含む" : "除く"}`;
    pdf.text(conditionsText, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;

    // テーブルヘッダー
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
    const colWidths = [20, 35, 15, 30, 25, 25, 25, 25]; // mm

    pdf.setFontSize(9);
    pdf.setFont("SawarabiGothic", "normal");

    let xPosition = margin;
    headers.forEach((header, index) => {
      pdf.text(header, xPosition + (colWidths[index] / 2), yPosition, {
        align: "center",
      });
      xPosition += colWidths[index];
    });

    // ヘッダー下線
    pdf.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    yPosition += 8;

    // データ行
    pdf.setFont("SawarabiGothic", "normal");
    pdf.setFontSize(8);

    for (const item of data) {
      // ページ境界チェック
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;

        // 新ページでのヘッダー再描画
        pdf.setFont("SawarabiGothic", "normal");
        pdf.setFontSize(9);
        xPosition = margin;
        headers.forEach((header, index) => {
          pdf.text(header, xPosition + (colWidths[index] / 2), yPosition, {
            align: "center",
          });
          xPosition += colWidths[index];
        });
        pdf.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
        yPosition += 8;
        pdf.setFont("SawarabiGothic", "normal");
        pdf.setFontSize(8);
      }

      xPosition = margin;

      // 階層表示のためのインデント
      const indent = item.level * 3;

      // 科目コード
      pdf.text(item.accountCode, xPosition + 2, yPosition);
      xPosition += colWidths[0];

      // 科目名（インデント適用）
      pdf.text(item.accountName, xPosition + 2 + indent, yPosition);
      xPosition += colWidths[1];

      // 補助コード
      pdf.text(item.subAccountCode || "", xPosition + 2, yPosition);
      xPosition += colWidths[2];

      // 補助科目名
      pdf.text(item.subAccountName || "", xPosition + 2, yPosition);
      xPosition += colWidths[3];

      // 金額（右寄せ）
      const formatAmount = (amount: number) => amount.toLocaleString("ja-JP");

      pdf.text(
        formatAmount(item.openingBalance),
        xPosition + colWidths[4] - 2,
        yPosition,
        { align: "right" },
      );
      xPosition += colWidths[4];

      pdf.text(
        formatAmount(item.debitAmount),
        xPosition + colWidths[5] - 2,
        yPosition,
        { align: "right" },
      );
      xPosition += colWidths[5];

      pdf.text(
        formatAmount(item.creditAmount),
        xPosition + colWidths[6] - 2,
        yPosition,
        { align: "right" },
      );
      xPosition += colWidths[6];

      pdf.text(
        formatAmount(item.closingBalance),
        xPosition + colWidths[7] - 2,
        yPosition,
        { align: "right" },
      );

      yPosition += 6;
    }

    // フッター
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`${i} / ${totalPages}`, pageWidth - margin, 285, {
        align: "right",
      });
      pdf.text(
        `作成日時: ${
          format(new Date(), "yyyy年MM月dd日 HH:mm", { locale: ja })
        }`,
        margin,
        285,
      );
    }

    // ファイル名生成
    const fromStr = format(dateFrom, "yyyyMMdd", { locale: ja });
    const toStr = format(dateTo, "yyyyMMdd", { locale: ja });
    const filename = `試算表_${fromStr}-${toStr}_${
      format(new Date(), "yyyyMMdd_HHmmss", { locale: ja })
    }.pdf`;

    // PDF保存
    pdf.save(filename);
  } catch (error) {
    console.error("PDF出力エラー:", error);
    throw new Error("PDF出力中にエラーが発生しました");
  }
}

/**
 * HTML要素をPDFに変換する（高品質版）
 */
export async function generateTrialBalancePdfFromHtml(
  elementId: string,
  options: Omit<TrialBalancePdfOptions, "data">,
): Promise<void> {
  const { dateFrom, dateTo } = options;

  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error("PDF出力対象の要素が見つかりません");
    }

    // html2canvasでHTML要素をキャンバスに変換
    const canvas = await html2canvas(element, {
      scale: 2, // 高解像度
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");

    // PDF作成
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // 最初のページ
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    // 複数ページ対応
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    // ファイル名生成
    const fromStr = format(dateFrom, "yyyyMMdd", { locale: ja });
    const toStr = format(dateTo, "yyyyMMdd", { locale: ja });
    const filename = `試算表_${fromStr}-${toStr}_${
      format(new Date(), "yyyyMMdd_HHmmss", { locale: ja })
    }.pdf`;

    // PDF保存
    pdf.save(filename);
  } catch (error) {
    console.error("PDF出力エラー:", error);
    throw new Error("PDF出力中にエラーが発生しました");
  }
}
