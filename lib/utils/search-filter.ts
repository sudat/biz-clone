import { SearchState } from "@/components/accounting/master-data-search";

/**
 * 検索条件に基づいてデータをフィルタリングする
 */
export function filterData<T extends Record<string, unknown>>(
  data: T[],
  searchState: SearchState,
  searchFields: string[] = [],
): T[] {
  let filteredData = [...data];

  // テキスト検索
  if (searchState.searchTerm && searchFields.length > 0) {
    const searchTerm = searchState.searchTerm.toLowerCase();
    filteredData = filteredData.filter((item) =>
      searchFields.some((field) => {
        const value = getNestedValue(item, field);
        return value && value.toString().toLowerCase().includes(searchTerm);
      })
    );
  }

  // カスタムフィルター
  Object.entries(searchState.filters).forEach(([field, value]) => {
    if (value !== undefined && value !== "") {
      filteredData = filteredData.filter((item) => {
        const itemValue = getNestedValue(item, field);
        if (typeof value === "boolean") {
          return itemValue === value;
        }
        return itemValue &&
          itemValue.toString().toLowerCase().includes(value.toLowerCase());
      });
    }
  });

  // 有効状態フィルター
  if (searchState.activeOnly) {
    filteredData = filteredData.filter((item) => item.isActive === true);
  }

  return filteredData;
}

/**
 * 検索条件に基づいてデータをソートする
 */
export function sortData<T extends Record<string, unknown>>(
  data: T[],
  searchState: SearchState,
): T[] {
  if (!searchState.sortField) {
    return data;
  }

  return [...data].sort((a, b) => {
    const aValue = getNestedValue(a, searchState.sortField);
    const bValue = getNestedValue(b, searchState.sortField);

    // null/undefined の処理
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // 数値の比較
    if (typeof aValue === "number" && typeof bValue === "number") {
      const result = aValue - bValue;
      return searchState.sortDirection === "asc" ? result : -result;
    }

    // 文字列の比較
    const aStr = aValue.toString().toLowerCase();
    const bStr = bValue.toString().toLowerCase();
    const result = aStr.localeCompare(bStr, "ja");
    return searchState.sortDirection === "asc" ? result : -result;
  });
}

/**
 * 検索とソートを組み合わせて実行する
 */
export function searchAndSort<T extends Record<string, unknown>>(
  data: T[],
  searchState: SearchState,
  searchFields: string[] = [],
): T[] {
  const filtered = filterData(data, searchState, searchFields);
  return sortData(filtered, searchState);
}

/**
 * ネストされたオブジェクトの値を取得する
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * 検索結果でマッチした部分をハイライトする
 */
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm || !text) return text;

  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, "gi");
  return text.replace(
    regex,
    '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>',
  );
}

/**
 * 正規表現で使用される特殊文字をエスケープする
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 検索統計情報を取得する
 */
export function getSearchStats<T>(
  originalData: T[],
  filteredData: T[],
): {
  total: number;
  filtered: number;
  showing: number;
} {
  return {
    total: originalData.length,
    filtered: filteredData.length,
    showing: filteredData.length,
  };
}
