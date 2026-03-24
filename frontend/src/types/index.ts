// ============================================================
// Wspólne typy domenowe RCMLight
// ============================================================

export type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

export interface Company {
  id: string;
  name: string;
  logoUrl?: string | null;
  defaultDowntimeCostPerHour: number;
  defaultTechnicianHourlyCost: number;
  defaultAllowedUnavailability: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  companyId: string;
  company?: Company;
  isActive: boolean;
  createdAt: string;
}

export interface Machine {
  id: string;
  name: string;
  number: string;
  location?: string | null;
  description?: string | null;
  companyId: string;
  allowedUnavailability: number;
  machineDowntimeCostPerHour: number;
  technicianHourlyCost: number;
  createdAt: string;
  updatedAt: string;
}

// ── API responses ────────────────────────────────────────────

export interface ApiResponse<T> {
  status: 'ok' | 'error';
  data: T;
}

export interface ApiError {
  status: 'error';
  message: string;
  issues?: Array<{ path: string[]; message: string }>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

// ── Auth ─────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ── BOM types ─────────────────────────────────────────────────

export interface SparePart {
  id: string;
  name: string;
  catalogNumber: string | null;
  materialGroupId: string;
}

export interface MaterialGroup {
  id: string;
  code: string;
  name: string;
  category: string;
  assemblyId: string;
  spareParts: SparePart[];
}

export interface Assembly {
  id: string;
  number: string;
  name: string;
  systemId: string;
  materialGroups: MaterialGroup[];
}

export interface BomSystem {
  id: string;
  number: number;
  name: string;
  machineId: string;
  assemblies: Assembly[];
}

export interface MachineWithBOM extends Machine {
  systems: BomSystem[];
}

// ── RCM types ─────────────────────────────────────────────────

export type FunctionLevel = 'SYSTEM' | 'ASSEMBLY';

export interface FunctionDef {
  id: string;
  code: string;
  description: string;
  standard: string;
  level: FunctionLevel;
  systemId: string | null;
  assemblyId: string | null;
  system: { id: string; name: string; number: number } | null;
  assembly: { id: string; name: string; number: string } | null;
  _count: { functionalFailures: number };
}

export interface FunctionalFailure {
  id: string;
  code: string;
  description: string;
  functionId: string;
  _count: { physicalFailures: number };
}

export interface Criticality {
  id: string;
  causeId: string;
  safety: number;
  impact: number; // legacy, not used in UI
  quality: number;
  production: number;
  frequency: number;
  availability: number;
  repairCost: number;
  laborTime: number;
  downtimeHours: number | null;
  qualityLossCost: number | null;
  secondaryDamageCost: number | null;
  sparepartCost: number | null;
  repairManHours: number | null;
  // computed by backend (may be present in rcm-analysis response)
  consequenceIndex?: number | null;
  workloadIndex?: number | null;
  criticalityIndex?: number | null;
  totalFailureCost?: number | null;
}

export type PMTaskType = 'REDESIGN' | 'PDM' | 'PM_INSPECTION' | 'PM_OVERHAUL' | 'RTF';

export interface PMTask {
  id: string;
  causeId: string;
  taskType: PMTaskType;
  description: string;
  assignedTo: string | null;
  isActive: boolean;
  plannedDowntimeH: number | null;
  sparepartCost: number | null;
  repairManHours: number | null;
  finalFrequencyMonths: number | null;
  calculatedFrequencyMonths: number | null;
  totalCostPM: number | null;
}

export interface FailureCause {
  id: string;
  code: string;
  description: string;
  physicalFailureId: string;
  criticality: Criticality | null;
  pmTask: PMTask | null;
}

export interface PhysicalFailure {
  id: string;
  code: string;
  description: string;
  mtbfMonths: number | null;
  materialGroupId: string;
  functionalFailureId: string;
  materialGroup: { id: string; code: string; name: string };
  _count: { causes: number };
}

// PhysicalFailure shape in rcm-analysis (richer, has FF and causes embedded)
export interface PhysicalFailureAnalysis {
  id: string;
  code: string;
  description: string;
  mtbfMonths: number | null;
  materialGroupId: string;
  materialGroup?: { id: string; code: string; name: string };
  functionalFailureId: string;
  functionalFailure: {
    id: string;
    code: string;
    description: string;
    function: { id: string; code: string; description: string; level: FunctionLevel };
  };
  causes: FailureCause[];
}

export interface RcmMaterialGroup {
  id: string;
  code: string;
  name: string;
  category: string;
  physicalFailures: PhysicalFailureAnalysis[];
}

export interface RcmAssembly {
  id: string;
  number: string;
  name: string;
  materialGroups: RcmMaterialGroup[];
}

export interface RcmSystem {
  id: string;
  number: number;
  name: string;
  assemblies: RcmAssembly[];
}

export interface RcmAnalysis {
  id: string;
  name: string;
  number: string;
  machineDowntimeCostPerHour: number;
  technicianHourlyCost: number;
  allowedUnavailability: number;
  systems: RcmSystem[];
}

// ── Settings ──────────────────────────────────────────────────

export type CriteriaCategory =
  | 'SAFETY'
  | 'IMPACT'
  | 'QUALITY'
  | 'PRODUCTION'
  | 'FREQUENCY'
  | 'REPAIR_COST'
  | 'LABOR'
  | 'AVAILABILITY';

export interface CriticalityCriteria {
  id: string;
  companyId: string;
  category: CriteriaCategory;
  level: number;
  label: string;
  description: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface MaterialGroupTemplate {
  id: string;
  companyId: string;
  code: string;
  name: string;
  category: string;
  categoryName: string;
  description: string | null;
  inspectionStandards: string | null;
  typicalCauses: string | null;
  isActive: boolean;
  sortOrder: number;
}

// ── Analysis step ─────────────────────────────────────────────

export type AnalysisStep =
  | 'bom'
  | 'functions'
  | 'physical-failures'
  | 'criticality'
  | 'pm-tasks'
  | 'summary';

export const ANALYSIS_STEPS: { key: AnalysisStep; label: string }[] = [
  { key: 'bom', label: 'Struktura BOM' },
  { key: 'functions', label: 'Funkcje i dysfunkcje' },
  { key: 'physical-failures', label: 'Uszkodzenia fizyczne' },
  { key: 'criticality', label: 'Krytyczność' },
  { key: 'pm-tasks', label: 'Zadania PM' },
  { key: 'summary', label: 'Podsumowanie' },
];
