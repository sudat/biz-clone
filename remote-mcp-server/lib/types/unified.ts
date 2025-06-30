// Unified types for remote-mcp-server
import type { Prisma } from "@prisma/client";

export interface Account {
  accountCode: string;
  accountName: string;
  accountType: string;
  sortOrder?: number | null;
  defaultTaxCode?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Partner {
  partnerCode: string;
  partnerName: string;
  partnerKana?: string | null;
  partnerType: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalysisCode {
  analysisCode: string;
  analysisName: string;
  analysisType: string;
  sortOrder?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  analysisTypeRel?: any;
}
