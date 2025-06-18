import jsPDF from "jspdf";

let _fontLoaded = false;

/**
 * jsPDF に日本語フォント(SawarabiGothic)を埋め込むユーティリティ
 * ------------------------------------------------------------
 * public/fonts/SawarabiGothic-Regular.ttf を読み込み、
 * 初回呼び出し時に fetch でフォントファイルを取得し、Base64 化して VFS に登録する。
 * 2 回目以降はキャッシュされた状態を利用する。
 * フォントサイズ: 約1.8MB（NotoSansJP可変フォント8.7MBから大幅軽量化）
 */
export async function loadJapaneseFont(pdf: jsPDF) {
  if (_fontLoaded) return;

  try {
    const res = await fetch("/fonts/SawarabiGothic-Regular.ttf");
    if (!res.ok) {
      console.error("日本語フォントの読み込みに失敗しました");
      return;
    }
    const buffer = await res.arrayBuffer();
    // ArrayBuffer -> Base64
    const uint8Array = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    const fontFileName = "SawarabiGothic-Regular.ttf";
    const fontName = "SawarabiGothic";

    pdf.addFileToVFS(fontFileName, base64);
    pdf.addFont(fontFileName, fontName, "normal");

    _fontLoaded = true;
  } catch (error) {
    console.error("日本語フォント登録エラー:", error);
    console.warn(
      "日本語フォントの読み込みに失敗しましたが、処理を継続します（Helveticaで代替）",
    );
  }
}
