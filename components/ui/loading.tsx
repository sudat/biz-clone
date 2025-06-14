"use client";

import React from "react";
import { Loader2, AlertCircle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  );
}

interface LoadingPageProps {
  message?: string;
  className?: string;
}

export function LoadingPage({
  message = "読み込み中...",
  className,
}: LoadingPageProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] space-y-4",
        className
      )}
    >
      <LoadingSpinner size="lg" />
      <p className="text-lg text-muted-foreground">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center",
        className
      )}
    >
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-muted-foreground max-w-[500px]">{description}</p>
        )}
      </div>
      {action && action}
    </div>
  );
}

type StatusType = "loading" | "error" | "success" | "info";

interface StatusMessageProps {
  type: StatusType;
  title: string;
  message?: string;
  className?: string;
}

const statusConfig = {
  loading: {
    icon: Loader2,
    className: "text-blue-500",
    bgClassName:
      "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    spinAnimation: true,
  },
  error: {
    icon: AlertCircle,
    className: "text-red-500",
    bgClassName: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    spinAnimation: false,
  },
  success: {
    icon: CheckCircle,
    className: "text-green-500",
    bgClassName:
      "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
    spinAnimation: false,
  },
  info: {
    icon: Info,
    className: "text-blue-500",
    bgClassName:
      "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    spinAnimation: false,
  },
};

export function StatusMessage({
  type,
  title,
  message,
  className,
}: StatusMessageProps) {
  const config = statusConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-lg border p-4", config.bgClassName, className)}>
      <div className="flex items-start space-x-3">
        <Icon
          className={cn(
            "h-5 w-5 mt-0.5",
            config.className,
            config.spinAnimation && "animate-spin"
          )}
        />
        <div className="space-y-1">
          <h4 className="text-sm font-medium">{title}</h4>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// 保存ボタン用のローディング状態
interface SaveButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SaveButton({
  isLoading = false,
  loadingText = "保存中...",
  children,
  onClick,
  disabled,
  variant = "default",
  size = "default",
  className,
}: SaveButtonProps) {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "destructive" &&
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        variant === "outline" &&
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        variant === "secondary" &&
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
        variant === "link" && "text-primary underline-offset-4 hover:underline",
        size === "default" && "h-10 px-4 py-2",
        size === "sm" && "h-9 rounded-md px-3",
        size === "lg" && "h-11 rounded-md px-8",
        size === "icon" && "h-10 w-10",
        className
      )}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLoading ? loadingText : children}
    </button>
  );
}
