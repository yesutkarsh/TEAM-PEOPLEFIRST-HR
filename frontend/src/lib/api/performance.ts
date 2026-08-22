/**
 * Performance management mock API (Phase 8).
 * Browser-storage backed — no backend. Dates are ISO strings.
 */
import type { ApiResponse } from "../types/api";
import type { Employee } from "../types/employee";
import type {
  Competency,
  FormSection,
  GoalStatus,
  KRA,
  KeyResult,
  NineBoxPosition,
  Objective,
  PIP,
  PIPCheckIn,
  PIPGoal,
  PerformanceSettings,
  RatingScale,
  Review,
  ReviewCycle,
  ReviewFormTemplate,
  ReviewSubmission,
} from "../types/performance";
import { delay, fail, ok, uid } from "./client";
import { listEmployees } from "./employees";

const SETTINGS_KEY = "hrms.perf.settings";
const OBJECTIVES_KEY = "hrms.perf.objectives";
const KRAS_KEY = "hrms.perf.kras";
const CYCLES_KEY = "hrms.perf.cycles";
const FORMS_KEY = "hrms.perf.forms";
const REVIEWS_KEY = "hrms.perf.reviews";
const PIPS_KEY = "hrms.perf.pips";
const SEEDED_KEY = "hrms.perf.seeded";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => iso(new Date(Date.now() + n * 86400000));

// ───────────────────────── defaults ─────────────────────────

export const DEFAULT_COMPETENCIES: Competency[] = [
  { id: "c_lead", name: "Leadership", description: "Guides others toward shared outcomes." },
  { id: "c_comm", name: "Communication", description: "Clear, timely and audience-aware." },
  { id: "c_prob", name: "Problem Solving", description: "Breaks down and resolves complex issues." },
  { id: "c_coll", name: "Collaboration", description: "Works effectively across teams." },
  { id: "c_acct", name: "Accountability", description: "Owns commitments end to end." },
  { id: "c_cust", name: "Customer Focus", description: "Puts customer outcomes first." },
  { id: "c_inno", name: "Innovation", description: "Improves how work gets done." },
  { id: "c_exec", name: "Execution", description: "Delivers reliably and on time." },
  { id: "c_adap", name: "Adaptability", description: "Responds well to change." },
];

export const DEFAULT_SCALES: RatingScale[] = [
  {
    id: "rs_5", name: "5-Point Scale", type: "numeric_5", isSystem: true,
    labels: [
      { value: 1, label: "Below Expectations", color: "#DC2626" },
      { value: 2, label: "Needs Improvement", color: "#F59E0B" },
      { value: 3, label: "Meets Expectations", color: "#2563EB" },
      { value: 4, label: "Exceeds Expectations", color: "#16A34A" },
      { value: 5, label: "Outstanding", color: "#0D9488" },
    ],
  },
  {
    id: "rs_10", name: "10-Point Scale", type: "numeric_10", isSystem: true,
    labels: Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
  },
];

const DEFAULT_SETTINGS: PerformanceSettings = {
  framework: "hybrid",
  goalPeriodicity: "quarterly",
  allowEmployeeGoalCreation: true,
  requireManagerApproval: true,
  minPeerReviewers: 3,
  competencies: DEFAULT_COMPETENCIES,
  ratingScales: DEFAULT_SCALES,
};

function defaultFormSections(): FormSection[] {
  return [
    {
      id: "sec_goals", title: "Goals Review", isConfidential: false,
      description: "Reflect on the goals set for this period.",
      respondents: ["self", "manager"],
      questions: [
        { id: "q_goals", type: "goal_review", label: "Goal achievement", required: true, displayOrder: 0 },
      ],
    },
    {
      id: "sec_comp", title: "Competencies", isConfidential: false,
      respondents: ["self", "manager", "peer"],
      questions: [
        {
          id: "q_comp", type: "competency_group", label: "Rate the following competencies",
          required: true, displayOrder: 0,
          competencyIds: ["c_lead", "c_comm", "c_exec", "c_coll"],
        },
      ],
    },
    {
      id: "sec_mgr", title: "Manager Feedback", isConfidential: true,
      respondents: ["manager"],
      questions: [
        { id: "q_str", type: "text", label: "What are this employee's key strengths?", required: true, displayOrder: 0 },
        { id: "q_imp", type: "text", label: "What areas need improvement?", required: true, displayOrder: 1 },
        { id: "q_rate", type: "rating", label: "Overall performance rating", required: true, displayOrder: 2 },
      ],
    },
  ];
}

// ───────────────────────── seed ─────────────────────────

function krProgress(kr: Pick<KeyResult, "targetValue" | "currentValue">) {
  if (!kr.targetValue) return 0;
  return Math.round((kr.currentValue / kr.targetValue) * 1000) / 10;
}

function statusFromProgress(p: number): GoalStatus {
  if (p >= 100) return "completed";
  if (p >= 70) return "on_track";
  if (p >= 45) return "at_risk";
  return "behind";
}

function mkObjective(
  partial: Omit<Objective, "progress" | "keyResults" | "status" | "createdAt"> & {
    krs: { title: string; target: number; current: number; unit: string }[];
  },
): Objective {
  const { krs, ...rest } = partial;
  const keyResults: KeyResult[] = krs.map((k, i) => {
    const progress = krProgress({ targetValue: k.target, currentValue: k.current });
    return {
      id: `${rest.id}_kr${i + 1}`,
      objectiveId: rest.id,
      title: k.title,
      targetValue: k.target,
      currentValue: k.current,
      unit: k.unit,
      progress,
      status: statusFromProgress(progress),
      lastUpdatedAt: daysFromNow(-3),
    };
  });
  const avg = keyResults.length
    ? Math.round((keyResults.reduce((s, k) => s + k.progress, 0) / keyResults.length) * 10) / 10
    : 0;
  return { ...rest, keyResults, progress: avg, status: statusFromProgress(avg), createdAt: daysFromNow(-60) };
}

function seedAll(employees: Employee[]) {
  const year = new Date().getFullYear();
  const quarter = (`q${Math.floor(new Date().getMonth() / 3) + 1}`) as Objective["period"];

  const form: ReviewFormTemplate = {
    id: "form_default", name: "Standard Review Form", sections: defaultFormSections(), usedInCycles: 1,
  };

  const cycles: ReviewCycle[] = [
    {
      id: "cyc_annual", name: `Annual Review ${year}-${String((year + 1) % 100).padStart(2, "0")}`,
      framework: "hybrid", period: "annual", year,
      startDate: daysFromNow(-120), endDate: daysFromNow(120),
      selfReviewDeadline: daysFromNow(12), managerReviewDeadline: daysFromNow(27),
      peerNominationDeadline: daysFromNow(5),
      status: "review_in_progress", includesPeerReview: true, includes360: false,
      includesCascadedGoals: true, ratingScaleId: "rs_5", reviewFormId: "form_default",
      completionRate: 0, employeeCount: employees.length,
    },
    {
      id: "cyc_h1", name: `Mid-Year Check-in ${year}`,
      framework: "okr", period: "h1", year,
      startDate: daysFromNow(-320), endDate: daysFromNow(-160),
      selfReviewDeadline: daysFromNow(-200), managerReviewDeadline: daysFromNow(-180),
      status: "completed", includesPeerReview: false, includes360: false,
      includesCascadedGoals: false, ratingScaleId: "rs_5", reviewFormId: "form_default",
      completionRate: 100, employeeCount: employees.length,
    },
  ];

  const deptIds = Array.from(new Set(employees.map((e) => e.departmentId))).slice(0, 3);

  const objectives: Objective[] = [
    mkObjective({
      id: "obj_company_1", title: "Grow to ₹10Cr ARR", description: "Company-wide revenue objective for the year.",
      ownerId: "company", level: "company", period: quarter, year, createdBy: "company",
      krs: [
        { title: "Revenue 8.5Cr by Sep", target: 8.5, current: 7.2, unit: "Cr" },
        { title: "Churn below 4%", target: 4, current: 4.2, unit: "%" },
        { title: "NPS above 40", target: 40, current: 38, unit: "pts" },
      ],
    }),
    mkObjective({
      id: "obj_company_2", title: "Become a top-3 employer in our category",
      ownerId: "company", level: "company", period: quarter, year, createdBy: "company",
      krs: [
        { title: "eNPS above 45", target: 45, current: 51, unit: "pts" },
        { title: "Regretted attrition below 8%", target: 8, current: 9.4, unit: "%" },
      ],
    }),
  ];

  deptIds.forEach((d, i) => {
    objectives.push(
      mkObjective({
        id: `obj_dept_${i + 1}`, title: i === 0 ? "Improve product uptime to 99.9%" : `Department objective ${i + 1}`,
        ownerId: `department:${d}`, level: "department", departmentId: d,
        parentObjectiveId: "obj_company_1", period: quarter, year, createdBy: "company",
        krs: [
          { title: "Uptime 99.9%", target: 99.9, current: i === 0 ? 99.2 : 96, unit: "%" },
          { title: "Mean time to recovery under 30m", target: 30, current: 44, unit: "min" },
        ],
      }),
    );
  });

  employees.slice(0, 8).forEach((e, i) => {
    objectives.push(
      mkObjective({
        id: `obj_ind_${e.id}`, title: ["Reduce P1 incidents to under 3/month", "Ship 4 customer-requested features", "Cut onboarding time to 5 days", "Close 12 enterprise deals"][i % 4],
        ownerId: e.id, level: "individual", departmentId: e.departmentId,
        parentObjectiveId: `obj_dept_1`, cycleId: "cyc_annual",
        period: quarter, year, createdBy: e.id,
        krs: [
          { title: "Primary metric", target: 100, current: [33, 72, 95, 125, 58][i % 5], unit: "%" },
          { title: "Secondary metric", target: 20, current: [6, 14, 20, 11, 18][i % 5], unit: "items" },
        ],
      }),
    );
  });

  // KRAs — always sum to 100 in seed data.
  const kras: KRA[] = [];
  employees.slice(0, 8).forEach((e) => {
    const base = [
      { name: "Delivery Excellence", weightage: 40 },
      { name: "Quality & Reliability", weightage: 35 },
      { name: "Collaboration", weightage: 25 },
    ];
    base.forEach((b, i) => {
      const kraId = `kra_${e.id}_${i}`;
      kras.push({
        id: kraId, employeeId: e.id, cycleId: "cyc_annual", name: b.name, weightage: b.weightage,
        rating: i === 2 ? undefined : 3 + (i % 2),
        kpis: [
          { id: `${kraId}_k1`, kraId, name: `${b.name} — primary KPI`, targetValue: 100, actualValue: 70 + i * 8, unit: "%", weightage: 60, rating: 3 + (i % 2) },
          { id: `${kraId}_k2`, kraId, name: `${b.name} — secondary KPI`, targetValue: 12, actualValue: 9, unit: "items", weightage: 40 },
        ],
      });
    });
  });

  const reviews: Review[] = employees.map((e, i) => {
    const mgr = e.reportingManagerId ?? employees[0].id;
    const bucket = i % 5;
    const status: Review["status"] =
      bucket === 0 ? "completed" : bucket === 1 ? "manager_complete" : bucket === 2 ? "self_complete" : bucket === 3 ? "self_pending" : "not_started";
    const selfRating = 3 + (i % 3) * 0.5;
    const mgrRating = 3 + ((i + 1) % 3) * 0.5;
    const hasSelf = ["self_complete", "manager_complete", "completed"].includes(status);
    const hasMgr = ["manager_complete", "completed"].includes(status);
    const perfAxis = (["low", "medium", "high"] as const)[i % 3];
    const potAxis = (["medium", "high", "low"] as const)[i % 3];
    return {
      id: `rev_${e.id}`,
      cycleId: "cyc_annual",
      employeeId: e.id,
      managerId: mgr,
      status,
      selfMissed: bucket === 4 && i % 2 === 0,
      selfAssessment: hasSelf
        ? { id: `sub_self_${e.id}`, reviewId: `rev_${e.id}`, submitterId: e.id, submittedAt: daysFromNow(-8), responses: [], overallRating: selfRating, overallComment: "Delivered on the main commitments this period.", isDraft: false }
        : undefined,
      managerReview: hasMgr
        ? { id: `sub_mgr_${e.id}`, reviewId: `rev_${e.id}`, submitterId: mgr, submittedAt: daysFromNow(-4), responses: [], overallRating: mgrRating, overallComment: "Strong execution, room to grow on stakeholder communication.", isDraft: false }
        : undefined,
      peerReviews: [],
      calibratedRating: hasMgr ? mgrRating : undefined,
      ninebox: hasMgr ? { performance: perfAxis, potential: potAxis } : undefined,
      isSharedWithEmployee: status === "completed" && i % 2 === 0,
      peerNominees: [],
      managerChangedMidCycle: i % 7 === 0 && i > 0,
    };
  });

  const pipEmp = employees[3] ?? employees[0];
  const pips: PIP[] = pipEmp
    ? [
        {
          id: "pip_1", employeeId: pipEmp.id, managerId: pipEmp.reportingManagerId ?? employees[0].id,
          createdBy: "hr", startDate: daysFromNow(-30), endDate: daysFromNow(30),
          reason: "Consistent misses against delivery commitments over two quarters.",
          status: "active",
          goals: [
            { id: "pipg_1", pipId: "pip_1", description: "Close all assigned tickets within SLA", metric: "95% SLA adherence", dueDate: daysFromNow(15), status: "in_progress" },
            { id: "pipg_2", pipId: "pip_1", description: "Complete code review turnaround in 24h", metric: "Average < 24h", dueDate: daysFromNow(30), status: "pending" },
          ],
          checkIns: [
            { id: "pipc_1", pipId: "pip_1", date: daysFromNow(-14), notes: "Improvement visible on ticket throughput. Review turnaround still slow.", byId: "hr", goalsStatusSnapshot: [{ goalId: "pipg_1", status: "in_progress" }] },
          ],
        },
      ]
    : [];

  write(SETTINGS_KEY, DEFAULT_SETTINGS);
  write(FORMS_KEY, [form]);
  write(CYCLES_KEY, cycles);
  write(OBJECTIVES_KEY, objectives);
  write(KRAS_KEY, kras);
  write(REVIEWS_KEY, reviews);
  write(PIPS_KEY, pips);
  write(SEEDED_KEY, true);
}

let seeding: Promise<void> | null = null;
async function ensureSeed() {
  if (typeof window === "undefined") return;
  if (read<boolean>(SEEDED_KEY, false)) return;
  if (!seeding) {
    seeding = (async () => {
      const res = await listEmployees();
      seedAll(res.data ?? []);
    })();
  }
  await seeding;
}

// ───────────────────────── derived helpers ─────────────────────────

export function objectiveDisplayProgress(o: Objective) {
  return Math.min(100, Math.round(o.progress));
}

/** Edge case 14 — weighted KRA final score; null when any KRA is unrated. */
export function kraFinalScore(kras: KRA[]): number | null {
  if (!kras.length) return null;
  if (kras.some((k) => k.rating === undefined || k.rating === null)) return null;
  const total = kras.reduce((s, k) => s + k.weightage * (k.rating ?? 0), 0);
  return Math.round((total / 100) * 100) / 100;
}

export function weightageTotal(kras: { weightage: number }[]) {
  return kras.reduce((s, k) => s + (Number(k.weightage) || 0), 0);
}

function computeCompletion(reviews: Review[], cycleId: string) {
  const list = reviews.filter((r) => r.cycleId === cycleId);
  if (!list.length) return 0;
  const done = list.filter((r) => r.status === "completed" || r.status === "manager_complete").length;
  return Math.round((done / list.length) * 100);
}

// ───────────────────────── API ─────────────────────────

export const performanceApi = {
  // Settings ---------------------------------------------------------------
  async getSettings(): Promise<ApiResponse<PerformanceSettings>> {
    await ensureSeed();
    return delay(ok(read<PerformanceSettings>(SETTINGS_KEY, DEFAULT_SETTINGS)));
  },
  async updateSettings(patch: Partial<PerformanceSettings>): Promise<ApiResponse<PerformanceSettings>> {
    const curr = read<PerformanceSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
    const next = { ...curr, ...patch };
    write(SETTINGS_KEY, next);
    return delay(ok(next));
  },

  // Objectives -------------------------------------------------------------
  async listObjectives(filters: { ownerId?: string; level?: Objective["level"]; year?: number; period?: Objective["period"] } = {}): Promise<ApiResponse<Objective[]>> {
    await ensureSeed();
    let list = read<Objective[]>(OBJECTIVES_KEY, []);
    if (filters.ownerId) list = list.filter((o) => o.ownerId === filters.ownerId);
    if (filters.level) list = list.filter((o) => o.level === filters.level);
    if (filters.year) list = list.filter((o) => o.year === filters.year);
    if (filters.period) list = list.filter((o) => o.period === filters.period);
    return delay(ok(list));
  },
  async saveObjective(input: Partial<Objective> & { title: string; ownerId: string; level: Objective["level"] }): Promise<ApiResponse<Objective>> {
    const list = read<Objective[]>(OBJECTIVES_KEY, []);
    if (input.id) {
      const idx = list.findIndex((o) => o.id === input.id);
      if (idx === -1) return delay(fail("Objective not found."));
      list[idx] = { ...list[idx], ...input } as Objective;
      write(OBJECTIVES_KEY, list);
      return delay(ok(list[idx]));
    }
    const created: Objective = {
      id: uid("obj_"),
      title: input.title,
      description: input.description,
      ownerId: input.ownerId,
      level: input.level,
      departmentId: input.departmentId,
      parentObjectiveId: input.parentObjectiveId,
      cycleId: input.cycleId,
      period: input.period ?? "q1",
      year: input.year ?? new Date().getFullYear(),
      status: "active",
      progress: 0,
      keyResults: input.keyResults ?? [],
      createdBy: input.createdBy ?? input.ownerId,
      createdAt: iso(new Date()),
    };
    list.push(created);
    write(OBJECTIVES_KEY, list);
    return delay(ok(created));
  },
  /** Edge case 1 — never orphan cascaded goals. */
  async countChildObjectives(objectiveId: string): Promise<number> {
    await ensureSeed();
    return read<Objective[]>(OBJECTIVES_KEY, []).filter((o) => o.parentObjectiveId === objectiveId).length;
  },
  async deleteObjective(id: string): Promise<ApiResponse<true>> {
    const list = read<Objective[]>(OBJECTIVES_KEY, []);
    const children = list.filter((o) => o.parentObjectiveId === id).length;
    if (children > 0) {
      return delay(
        fail(`This objective has ${children} linked team/individual goals. Delete them first or unlink them before removing this objective.`),
      );
    }
    write(OBJECTIVES_KEY, list.filter((o) => o.id !== id));
    return delay(ok(true as const));
  },
  async updateKeyResult(objectiveId: string, krId: string, currentValue: number): Promise<ApiResponse<Objective>> {
    const list = read<Objective[]>(OBJECTIVES_KEY, []);
    const obj = list.find((o) => o.id === objectiveId);
    if (!obj) return delay(fail("Objective not found."));
    const kr = obj.keyResults.find((k) => k.id === krId);
    if (!kr) return delay(fail("Key result not found."));
    kr.currentValue = currentValue;
    // Over-achievement is preserved (progress may exceed 100).
    kr.progress = krProgress(kr);
    kr.status = statusFromProgress(kr.progress);
    kr.lastUpdatedAt = iso(new Date());
    obj.progress = Math.round((obj.keyResults.reduce((s, k) => s + k.progress, 0) / obj.keyResults.length) * 10) / 10;
    obj.status = statusFromProgress(obj.progress);
    write(OBJECTIVES_KEY, list);
    return delay(ok(obj));
  },
  async addKeyResult(objectiveId: string, kr: { title: string; targetValue: number; currentValue: number; unit: string }): Promise<ApiResponse<Objective>> {
    const list = read<Objective[]>(OBJECTIVES_KEY, []);
    const obj = list.find((o) => o.id === objectiveId);
    if (!obj) return delay(fail("Objective not found."));
    const progress = krProgress(kr);
    obj.keyResults.push({
      id: uid("kr_"), objectiveId, title: kr.title, targetValue: kr.targetValue,
      currentValue: kr.currentValue, unit: kr.unit, progress, status: statusFromProgress(progress),
      lastUpdatedAt: iso(new Date()),
    });
    obj.progress = Math.round((obj.keyResults.reduce((s, k) => s + k.progress, 0) / obj.keyResults.length) * 10) / 10;
    obj.status = statusFromProgress(obj.progress);
    write(OBJECTIVES_KEY, list);
    return delay(ok(obj));
  },

  // KRAs -------------------------------------------------------------------
  async listKras(employeeId: string, cycleId?: string): Promise<ApiResponse<KRA[]>> {
    await ensureSeed();
    const list = read<KRA[]>(KRAS_KEY, []).filter(
      (k) => k.employeeId === employeeId && (!cycleId || k.cycleId === cycleId),
    );
    return delay(ok(list));
  },
  async saveKras(employeeId: string, cycleId: string, kras: KRA[], force = false, note?: string): Promise<ApiResponse<KRA[]>> {
    // Edge case 2 — weightage must total 100 unless HR explicitly overrides with a note.
    const total = weightageTotal(kras);
    if (total !== 100 && !force) return delay(fail(`KRA weightage must total 100%. Current total is ${total}%.`));
    if (total !== 100 && force && !note?.trim()) return delay(fail("A note is required to submit unbalanced KRA weightage."));
    const all = read<KRA[]>(KRAS_KEY, []).filter((k) => !(k.employeeId === employeeId && k.cycleId === cycleId));
    write(KRAS_KEY, [...all, ...kras]);
    return delay(ok(kras));
  },

  // Cycles + forms ---------------------------------------------------------
  async listCycles(): Promise<ApiResponse<ReviewCycle[]>> {
    await ensureSeed();
    const cycles = read<ReviewCycle[]>(CYCLES_KEY, []);
    const reviews = read<Review[]>(REVIEWS_KEY, []);
    return delay(ok(cycles.map((c) => ({ ...c, completionRate: c.status === "completed" ? 100 : computeCompletion(reviews, c.id) }))));
  },
  async getCycle(id: string): Promise<ApiResponse<ReviewCycle>> {
    const res = await this.listCycles();
    const c = res.data?.find((x) => x.id === id);
    return c ? ok(c) : fail("Cycle not found.");
  },
  /** Edge case 4 — overlap is a warning, never a block. */
  async findOverlappingCycles(start: string, end: string, deptIds: string[] | undefined, ignoreId?: string): Promise<ReviewCycle[]> {
    await ensureSeed();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return read<ReviewCycle[]>(CYCLES_KEY, []).filter((c) => {
      if (c.id === ignoreId) return false;
      if (!["active", "draft", "review_in_progress"].includes(c.status)) return false;
      const overlapDept =
        !deptIds?.length || !c.departmentIds?.length || c.departmentIds.some((d) => deptIds.includes(d));
      const overlapDate = new Date(c.startDate).getTime() <= e && new Date(c.endDate).getTime() >= s;
      return overlapDept && overlapDate;
    });
  },
  async saveCycle(input: Partial<ReviewCycle> & { name: string }): Promise<ApiResponse<ReviewCycle>> {
    const list = read<ReviewCycle[]>(CYCLES_KEY, []);
    if (input.id) {
      const idx = list.findIndex((c) => c.id === input.id);
      if (idx === -1) return delay(fail("Cycle not found."));
      // Edge case 13 — rating scale is locked once the cycle is no longer a draft.
      if (list[idx].status !== "draft" && input.ratingScaleId && input.ratingScaleId !== list[idx].ratingScaleId) {
        return delay(fail("Rating scale cannot be changed after a cycle is activated. Create a new cycle with the revised scale."));
      }
      list[idx] = { ...list[idx], ...input } as ReviewCycle;
      write(CYCLES_KEY, list);
      return delay(ok(list[idx]));
    }
    const created: ReviewCycle = {
      id: uid("cyc_"),
      name: input.name,
      framework: input.framework ?? "hybrid",
      period: input.period ?? "annual",
      year: input.year ?? new Date().getFullYear(),
      startDate: input.startDate ?? daysFromNow(0),
      endDate: input.endDate ?? daysFromNow(180),
      selfReviewDeadline: input.selfReviewDeadline ?? daysFromNow(30),
      managerReviewDeadline: input.managerReviewDeadline ?? daysFromNow(45),
      peerNominationDeadline: input.peerNominationDeadline,
      status: "draft",
      includesPeerReview: input.includesPeerReview ?? false,
      includes360: input.includes360 ?? false,
      includesCascadedGoals: input.includesCascadedGoals ?? true,
      ratingScaleId: input.ratingScaleId ?? "rs_5",
      reviewFormId: input.reviewFormId ?? "form_default",
      departmentIds: input.departmentIds,
      completionRate: 0,
      employeeCount: input.employeeCount ?? 0,
    };
    list.push(created);
    write(CYCLES_KEY, list);
    return delay(ok(created));
  },
  async setCycleStatus(id: string, status: ReviewCycle["status"]): Promise<ApiResponse<ReviewCycle>> {
    const list = read<ReviewCycle[]>(CYCLES_KEY, []);
    const c = list.find((x) => x.id === id);
    if (!c) return delay(fail("Cycle not found."));
    c.status = status;
    write(CYCLES_KEY, list);
    return delay(ok(c));
  },
  async duplicateCycle(id: string): Promise<ApiResponse<ReviewCycle>> {
    const list = read<ReviewCycle[]>(CYCLES_KEY, []);
    const src = list.find((x) => x.id === id);
    if (!src) return delay(fail("Cycle not found."));
    const copy: ReviewCycle = { ...src, id: uid("cyc_"), name: `${src.name} (copy)`, status: "draft", completionRate: 0 };
    list.push(copy);
    write(CYCLES_KEY, list);
    return delay(ok(copy));
  },
  async getForm(id: string): Promise<ApiResponse<ReviewFormTemplate>> {
    await ensureSeed();
    const f = read<ReviewFormTemplate[]>(FORMS_KEY, []).find((x) => x.id === id);
    return delay(f ? ok(f) : fail("Review form not found."));
  },
  async saveForm(form: ReviewFormTemplate): Promise<ApiResponse<ReviewFormTemplate>> {
    const list = read<ReviewFormTemplate[]>(FORMS_KEY, []);
    const idx = list.findIndex((f) => f.id === form.id);
    if (idx === -1) list.push(form);
    else list[idx] = form;
    write(FORMS_KEY, list);
    return delay(ok(form));
  },

  // Reviews ----------------------------------------------------------------
  async listReviews(filters: { cycleId?: string; employeeId?: string; managerId?: string } = {}): Promise<ApiResponse<Review[]>> {
    await ensureSeed();
    let list = read<Review[]>(REVIEWS_KEY, []);
    if (filters.cycleId) list = list.filter((r) => r.cycleId === filters.cycleId);
    if (filters.employeeId) list = list.filter((r) => r.employeeId === filters.employeeId);
    if (filters.managerId) list = list.filter((r) => r.managerId === filters.managerId);
    return delay(ok(list));
  },
  async getReview(id: string): Promise<ApiResponse<Review>> {
    await ensureSeed();
    const r = read<Review[]>(REVIEWS_KEY, []).find((x) => x.id === id);
    return delay(r ? ok(r) : fail("Review not found."));
  },
  async saveSubmission(
    reviewId: string,
    kind: "self" | "manager",
    submission: Omit<ReviewSubmission, "id" | "reviewId">,
  ): Promise<ApiResponse<Review>> {
    const list = read<Review[]>(REVIEWS_KEY, []);
    const r = list.find((x) => x.id === reviewId);
    if (!r) return delay(fail("Review not found."));
    const full: ReviewSubmission = {
      ...submission,
      id: uid("sub_"),
      reviewId,
      submittedAt: submission.isDraft ? undefined : iso(new Date()),
    };
    if (kind === "self") {
      r.selfAssessment = full;
      if (!submission.isDraft) {
        r.selfMissed = false;
        r.status = "self_complete";
      } else if (r.status === "not_started") r.status = "self_pending";
    } else {
      r.managerReview = full;
      if (!submission.isDraft) {
        const peerPending = r.peerReviews.some((p) => p.status === "pending");
        r.status = peerPending ? "peer_pending" : "manager_complete";
        r.calibratedRating = r.calibratedRating ?? full.overallRating;
      } else if (r.status !== "manager_complete") r.status = "manager_pending";
    }
    write(REVIEWS_KEY, list);
    return delay(ok(r));
  },
  /** Edge case 8 — a reviewee may never be their own peer reviewer. */
  async nominatePeers(reviewId: string, nomineeIds: string[]): Promise<ApiResponse<Review>> {
    const list = read<Review[]>(REVIEWS_KEY, []);
    const r = list.find((x) => x.id === reviewId);
    if (!r) return delay(fail("Review not found."));
    if (nomineeIds.includes(r.employeeId)) return delay(fail("You cannot nominate yourself as a peer reviewer."));
    r.peerNominees = nomineeIds;
    r.peerReviews = nomineeIds.map((id) => {
      const existing = r.peerReviews.find((p) => p.reviewerId === id);
      return existing ?? { id: uid("peer_"), reviewId, reviewerId: id, status: "pending" as const };
    });
    write(REVIEWS_KEY, list);
    return delay(ok(r));
  },
  async setPeerStatus(reviewId: string, reviewerId: string, status: "pending" | "completed" | "declined"): Promise<ApiResponse<Review>> {
    const list = read<Review[]>(REVIEWS_KEY, []);
    const r = list.find((x) => x.id === reviewId);
    if (!r) return delay(fail("Review not found."));
    const p = r.peerReviews.find((x) => x.reviewerId === reviewerId);
    if (p) p.status = status;
    write(REVIEWS_KEY, list);
    return delay(ok(r));
  },
  /** Edge case 10 — calibrated rating is stored separately from the manager rating. */
  async calibrate(reviewId: string, patch: { calibratedRating?: number; ninebox?: NineBoxPosition; calibrationNote?: string }): Promise<ApiResponse<Review>> {
    const list = read<Review[]>(REVIEWS_KEY, []);
    const r = list.find((x) => x.id === reviewId);
    if (!r) return delay(fail("Review not found."));
    Object.assign(r, patch);
    write(REVIEWS_KEY, list);
    return delay(ok(r));
  },
  /** Edge case 11 — sharing is always an explicit action. */
  async shareReviews(cycleId: string, reviewId?: string): Promise<ApiResponse<number>> {
    const list = read<Review[]>(REVIEWS_KEY, []);
    let count = 0;
    list.forEach((r) => {
      if (r.cycleId !== cycleId) return;
      if (reviewId && r.id !== reviewId) return;
      if (r.status === "manager_complete" || r.status === "completed") {
        r.isSharedWithEmployee = true;
        r.status = "completed";
        count += 1;
      }
    });
    write(REVIEWS_KEY, list);
    return delay(ok(count));
  },
  /** Edge case 7 — bulk-reassign pending manager reviews after a manager change. */
  async reassignManager(reviewIds: string[], newManagerId: string): Promise<ApiResponse<number>> {
    const list = read<Review[]>(REVIEWS_KEY, []);
    let n = 0;
    list.forEach((r) => {
      if (!reviewIds.includes(r.id)) return;
      r.managerId = newManagerId;
      r.managerChangedMidCycle = false;
      n += 1;
    });
    write(REVIEWS_KEY, list);
    return delay(ok(n));
  },
  async sendReminders(cycleId: string): Promise<ApiResponse<number>> {
    const list = read<Review[]>(REVIEWS_KEY, []).filter(
      (r) => r.cycleId === cycleId && r.status !== "completed" && r.status !== "manager_complete",
    );
    return delay(ok(list.length));
  },

  // PIPs -------------------------------------------------------------------
  async listPips(filters: { employeeId?: string; managerId?: string } = {}): Promise<ApiResponse<PIP[]>> {
    await ensureSeed();
    let list = read<PIP[]>(PIPS_KEY, []);
    if (filters.employeeId) list = list.filter((p) => p.employeeId === filters.employeeId);
    if (filters.managerId) list = list.filter((p) => p.managerId === filters.managerId);
    return delay(ok(list));
  },
  async createPip(input: {
    employeeId: string; managerId: string; createdBy: string; startDate: string; endDate: string;
    reason: string; goals: { description: string; metric: string; dueDate: string }[];
  }): Promise<ApiResponse<PIP>> {
    if (!input.goals.length) return delay(fail("A PIP needs at least one improvement goal."));
    const id = uid("pip_");
    const pip: PIP = {
      id, employeeId: input.employeeId, managerId: input.managerId, createdBy: input.createdBy,
      startDate: input.startDate, endDate: input.endDate, reason: input.reason, status: "active",
      goals: input.goals.map((g): PIPGoal => ({ id: uid("pipg_"), pipId: id, ...g, status: "pending" })),
      checkIns: [],
    };
    const list = read<PIP[]>(PIPS_KEY, []);
    list.push(pip);
    write(PIPS_KEY, list);
    return delay(ok(pip));
  },
  async setPipGoalStatus(pipId: string, goalId: string, status: PIPGoal["status"]): Promise<ApiResponse<PIP>> {
    const list = read<PIP[]>(PIPS_KEY, []);
    const pip = list.find((p) => p.id === pipId);
    if (!pip) return delay(fail("PIP not found."));
    const g = pip.goals.find((x) => x.id === goalId);
    if (g) g.status = status;
    write(PIPS_KEY, list);
    return delay(ok(pip));
  },
  async addPipCheckIn(pipId: string, notes: string, byId: string): Promise<ApiResponse<PIP>> {
    const list = read<PIP[]>(PIPS_KEY, []);
    const pip = list.find((p) => p.id === pipId);
    if (!pip) return delay(fail("PIP not found."));
    const entry: PIPCheckIn = {
      id: uid("pipc_"), pipId, date: iso(new Date()), notes, byId,
      goalsStatusSnapshot: pip.goals.map((g) => ({ goalId: g.id, status: g.status })),
    };
    pip.checkIns.unshift(entry);
    write(PIPS_KEY, list);
    return delay(ok(pip));
  },
  async concludePip(pipId: string, outcome: PIP["outcome"], note: string): Promise<ApiResponse<PIP>> {
    const list = read<PIP[]>(PIPS_KEY, []);
    const pip = list.find((p) => p.id === pipId);
    if (!pip) return delay(fail("PIP not found."));
    pip.outcome = outcome;
    pip.outcomeNote = note;
    pip.concludedAt = iso(new Date());
    pip.status = outcome === "extended" ? "extended" : outcome === "separated" ? "terminated" : "completed";
    write(PIPS_KEY, list);
    return delay(ok(pip));
  },

  // Cross-module summary ---------------------------------------------------
  async cycleStats(cycleId: string): Promise<ApiResponse<{
    total: number; selfSubmitted: number; managerComplete: number; peerPending: number; completionRate: number;
    managerChanged: Review[];
  }>> {
    await ensureSeed();
    const list = read<Review[]>(REVIEWS_KEY, []).filter((r) => r.cycleId === cycleId);
    return delay(
      ok({
        total: list.length,
        selfSubmitted: list.filter((r) => !!r.selfAssessment && !r.selfAssessment.isDraft).length,
        managerComplete: list.filter((r) => r.status === "manager_complete" || r.status === "completed").length,
        peerPending: list.reduce((s, r) => s + r.peerReviews.filter((p) => p.status === "pending").length, 0),
        completionRate: computeCompletion(list, cycleId),
        managerChanged: list.filter((r) => r.managerChangedMidCycle),
      }),
    );
  },
};

export type { Employee };
