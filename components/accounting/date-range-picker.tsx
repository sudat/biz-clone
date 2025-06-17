/**
 * 期間選択コンポーネント
 * ============================================================================
 * レポート用の日付範囲選択機能
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface DateRangePickerProps {
  from?: Date;
  to?: Date;
  onRangeChange: (from: Date | undefined, to: Date | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  from,
  to,
  onRangeChange,
  className = "",
}: DateRangePickerProps) {
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  const handleFromChange = (date: Date | undefined) => {
    onRangeChange(date, to);
    setIsFromOpen(false);
  };

  const handleToChange = (date: Date | undefined) => {
    onRangeChange(from, date);
    setIsToOpen(false);
  };

  const handleQuickSelect = (period: string) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    let newFrom: Date | undefined;
    let newTo: Date | undefined;

    switch (period) {
      case "thisMonth":
        newFrom = new Date(year, month, 1);
        newTo = new Date(year, month + 1, 0);
        break;
      case "lastMonth":
        newFrom = new Date(year, month - 1, 1);
        newTo = new Date(year, month, 0);
        break;
      case "thisYear":
        newFrom = new Date(year, 0, 1);
        newTo = new Date(year, 11, 31);
        break;
      case "lastYear":
        newFrom = new Date(year - 1, 0, 1);
        newTo = new Date(year - 1, 11, 31);
        break;
      default:
        return;
    }

    onRangeChange(newFrom, newTo);
  };

  return (
    <div className={`flex flex-wrap items-end gap-4 ${className}`}>
      {/* 開始日 */}
      <div className="space-y-2">
        <Label htmlFor="from-date">開始日</Label>
        <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-40 justify-start text-left font-normal"
            >
              <CalendarIcon className="h-4 w-4" />
              {from
                ? format(from, "yyyy/MM/dd", { locale: ja })
                : "選択してください"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={from}
              onSelect={handleFromChange}
              locale={ja}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* 終了日 */}
      <div className="space-y-2">
        <Label htmlFor="to-date">終了日</Label>
        <Popover open={isToOpen} onOpenChange={setIsToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-40 justify-start text-left font-normal"
            >
              <CalendarIcon className="h-4 w-4" />
              {to
                ? format(to, "yyyy/MM/dd", { locale: ja })
                : "選択してください"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={to}
              onSelect={handleToChange}
              locale={ja}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* クイック選択ボタン */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleQuickSelect("thisMonth")}
      >
        今月
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleQuickSelect("lastMonth")}
      >
        先月
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleQuickSelect("thisYear")}
      >
        今年
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleQuickSelect("lastYear")}
      >
        昨年
      </Button>
    </div>
  );
}
