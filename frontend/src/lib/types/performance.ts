/** Performance management domain types (Phase 8). Frontend-only mock domain. */

export type GoalFramework = "okr" | "kra" | "hybrid";
export type GoalLevel = "company" | "department" | "team" | "individual";
export type GoalStatus =
  | "draft"
  | "active"
  | "on_track"
  | "at_risk"
  | "behind"
  | "completed"
  | "cancelled";
export type GoalPeriod = "q1" | "q2" | "q3" | "q4" | "h1" | "h2" | "annual" | "custom";

export const GOAL_PERIOD_LABELS: Record<GoalPeriod, string> = {
  q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4", h1: "H1", h2: "H2", annual: "Annual", custom: "Custom",
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  draft: "Draft",
  active: "Active",
  on_track: "On Track",
  at_risk: "At Risk",
  behind: "Behind",
  completed: "Completed",
  cancelled: "Cancelled",
};

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  /** Can exceed 100 — over-achievement is allowed and surfaced, never capped here. */
  progress: number;
  status: GoalStatus;
  dueDate?: string;
  lastUpdatedAt: string;
}

export interface Objective {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  level: GoalLevel;
  departmentId?: string;
  parentObjectiveId?: string;
  cycleId?: string;
  period: GoalPeriod;
  year: number;
  status: GoalStatus;
  /** Average of key-result progress. Display is capped at 100 (see GoalProgressRing). */
  progress: number;
  keyResults: KeyResult[];
  createdBy: string;
  createdAt: string;
}

export interface KPI {
  id: string;
  kraId: string;
  name: string;
  targetValue: number;
  actualValue?: number;
  unit: string;
  weightage: number;
  rating?: number;
}

export interface KRA {
  id: string;
  employeeId: string;
  cycleId: string;
  name: string;
  description?: string;
  /** All KRAs of an employee/cycle must sum to 100 — enforced in the editor. */
  weightage: number;
  kpis: KPI[];
  rating?: number;
}

export type ReviewCycleStatus =
  | "draft"
  | "active"
  | "review_in_progress"
  | "calibration"
  | "completed";

export const CYCLE_STATUS_LABELS: Record<ReviewCycleStatus, string> = {
  draft: "Draft",
  active: "Active",
  review_in_progress: "In Progress",
  calibration: "Calibration",
  completed: "Completed",
};

export interface RatingScaleLevel {
  value: number;
  label: string;
  color?: string;
}

export interface RatingScale {
  id: string;
  name: string;
  type: "numeric_5" | "numeric_10" | "custom";
  isSystem?: boolean;
  labels: RatingScaleLevel[];
}

export interface ReviewCycle {
  id: string;
  name: string;
  framework: GoalFramework;
  period: GoalPeriod;
  year: number;
  startDate: string;
  endDate: string;
  selfReviewDeadline: string;
  managerReviewDeadline: string;
  peerNominationDeadline?: string;
  status: ReviewCycleStatus;
  includesPeerReview: boolean;
  includes360: boolean;
  includesCascadedGoals: boolean;
  ratingScaleId: string;
  reviewFormId: string;
  departmentIds?: string[];
  completionRate: number;
  employeeCount: number;
}

export type ReviewStatus =
  | "not_started"
  | "self_pending"
  | "self_complete"
  | "manager_pending"
  | "manager_complete"
  | "peer_pending"
  | "completed";

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  not_started: "Not started",
  self_pending: "Self pending",
  self_complete: "Self complete",
  manager_pending: "Manager pending",
  manager_complete: "Manager complete",
  peer_pending: "Peer pending",
  completed: "Completed",
};

export interface ReviewResponse {
  questionId: string;
  competencyId?: string;
  rating?: number;
  text?: string;
}

export interface ReviewSubmission {
  id: string;
  reviewId: string;
  submitterId: string;
  submittedAt?: string;
  responses: ReviewResponse[];
  overallRating: number;
  overallComment: string;
  isDraft: boolean;
}

export interface PeerReview {
  id: string;
  reviewId: string;
  reviewerId: string;
  submission?: ReviewSubmission;
  status: "pending" | "completed" | "declined";
}

export interface Review {
  id: string;
  cycleId: string;
  employeeId: string;
  managerId: string;
  status: ReviewStatus;
  selfAssessment?: ReviewSubmission;
  /** Edge case 6 — deadline passed with no submission. */
  selfMissed?: boolean;
  managerReview?: ReviewSubmission;
  peerReviews: PeerReview[];
  /** Edge case 10 — stored separately, never overwrites managerReview.overallRating. */
  calibratedRating?: number;
  ninebox?: NineBoxPosition;
  calibrationNote?: string;
  isSharedWithEmployee: boolean;
  peerNominees: string[];
  /** Edge case 7 — manager changed after the cycle went active. */
  managerChangedMidCycle?: boolean;
}

export type FormQuestionType = "rating" | "text" | "competency_group" | "goal_review";

export interface Competency {
  id: string;
  name: string;
  description: string;
}

export interface FormQuestion {
  id: string;
  type: FormQuestionType;
  label: string;
  helpText?: string;
  required: boolean;
  competencyIds?: string[];
  displayOrder: number;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  /** true = HR + manager only, hidden from the employee's shared review. */
  isConfidential: boolean;
  respondents: ("self" | "manager" | "peer")[];
  questions: FormQuestion[];
}

export interface ReviewFormTemplate {
  id: string;
  name: string;
  sections: FormSection[];
  usedInCycles: number;
}

export interface NineBoxPosition {
  performance: "low" | "medium" | "high";
  potential: "low" | "medium" | "high";
}

export type PIPStatus = "active" | "completed" | "extended" | "terminated";
export type PIPOutcome = "improved" | "separated" | "extended";

export interface PIPGoal {
  id: string;
  pipId: string;
  description: string;
  metric: string;
  dueDate: string;
  status: "pending" | "in_progress" | "met" | "not_met";
  notes?: string;
}

export interface PIPCheckIn {
  id: string;
  pipId: string;
  date: string;
  notes: string;
  byId: string;
  goalsStatusSnapshot: { goalId: string; status: string }[];
}

export interface PIP {
  id: string;
  employeeId: string;
  managerId: string;
  createdBy: string;
  startDate: string;
  endDate: string;
  reason: string;
  goals: PIPGoal[];
  checkIns: PIPCheckIn[];
  status: PIPStatus;
  outcome?: PIPOutcome;
  outcomeNote?: string;
  concludedAt?: string;
}

export interface PerformanceSettings {
  framework: GoalFramework;
  goalPeriodicity: "quarterly" | "half_yearly" | "annual";
  allowEmployeeGoalCreation: boolean;
  requireManagerApproval: boolean;
  minPeerReviewers: number;
  competencies: Competency[];
  ratingScales: RatingScale[];
}
