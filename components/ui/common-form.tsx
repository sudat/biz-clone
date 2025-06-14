"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormFieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "password" | "select" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  description?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CommonFormProps<T extends Record<string, any>> {
  form: UseFormReturn<T>;
  fields: FormFieldConfig[];
  onSubmit: (data: T) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CommonForm<T extends Record<string, any>>({
  form,
  fields,
  onSubmit,
  submitLabel = "保存",
  cancelLabel = "キャンセル",
  onCancel,
  isLoading = false,
  className = "",
}: CommonFormProps<T>) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={`space-y-6 ${className}`}
      >
        {fields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </FormLabel>
                <FormControl>
                  {field.type === "select" ? (
                    <Select
                      onValueChange={formField.onChange}
                      defaultValue={formField.value}
                      disabled={field.disabled || isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      {...formField}
                      placeholder={field.placeholder}
                      disabled={field.disabled || isLoading}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  ) : (
                    <Input
                      {...formField}
                      type={field.type}
                      placeholder={field.placeholder}
                      disabled={field.disabled || isLoading}
                    />
                  )}
                </FormControl>
                {field.description && (
                  <p className="text-sm text-muted-foreground">
                    {field.description}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <div className="flex justify-end space-x-2 pt-6">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// 数値入力専用フィールド
export function NumberField({
  name,
  label,
  placeholder,
  required = false,
  min,
  max,
  step = 1,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) {
  return {
    name,
    label,
    type: "number" as const,
    placeholder,
    required,
    min,
    max,
    step,
  };
}

// 会計用のコード入力フィールド
export function CodeField({
  name,
  label,
  placeholder = "コードを入力",
  required = false,
  maxLength = 10,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return {
    name,
    label,
    type: "text" as const,
    placeholder,
    required,
    maxLength,
  };
}

// 金額入力フィールド
export function AmountField({
  name,
  label,
  placeholder = "0",
  required = false,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return {
    name,
    label,
    type: "number" as const,
    placeholder,
    required,
    min: 0,
    step: 1,
  };
}
