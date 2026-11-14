import "server-only";

import { randomBytes } from "node:crypto";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { learningDb as db } from "@/db/learning/client";
import {
  learningCertificates,
  learningCourses,
  learningEnrollments,
  learningExamAttempts,
  learningLearners,
  learningModules,
  learningPromoCodes,
  learningQuizAttempts,
} from "@/db/learning/schema";
import { MODULE_COUNT } from "@/lib/learning/engine";
import { CERTIFICATE_PROGRAM_LINE } from "@/lib/learning/certificate-demo";

export type AdminLearnerRow = {
  id: string;
  email: string;
  name: string;
  roleName: string;
  createdAt: Date;
  enrollmentId: string | null;
  startedAt: Date | null;
  lastAccessedAt: Date | null;
  completedAt: Date | null;
  modulesPassed: number;
  examPassed: boolean;
  examPercentage: number | null;
  certificateCode: string | null;
  certificateIssuedAt: Date | null;
};

function randomSegment(bytes = 4) {
  return randomBytes(bytes).toString("hex").toUpperCase();
}

export function generateVoucherCode() {
  return `CGLV-${randomSegment(3)}-${randomSegment(3)}`;
}

export function generateCouponCode() {
  return `CGLC-${randomSegment(3)}-${randomSegment(3)}`;
}

async function primaryCourse() {
  const [course] = await db.select().from(learningCourses).orderBy(desc(learningCourses.createdAt)).limit(1);
  return course ?? null;
}

export async function listAdminLearners(search = ""): Promise<AdminLearnerRow[]> {
  const course = await primaryCourse();
  if (!course) return [];

  const query = search.trim();
  const filter = query
    ? or(ilike(learningLearners.email, `%${query}%`), ilike(learningLearners.name, `%${query}%`))
    : undefined;

  const rows = await db
    .select({
      id: learningLearners.id,
      email: learningLearners.email,
      name: learningLearners.name,
      roleName: learningLearners.roleName,
      createdAt: learningLearners.createdAt,
      enrollmentId: learningEnrollments.id,
      startedAt: learningEnrollments.startedAt,
      lastAccessedAt: learningEnrollments.lastAccessedAt,
      completedAt: learningEnrollments.completedAt,
      certificateCode: learningCertificates.certificateCode,
      certificateIssuedAt: learningCertificates.issuedAt,
    })
    .from(learningLearners)
    .leftJoin(
      learningEnrollments,
      and(eq(learningEnrollments.learnerId, learningLearners.id), eq(learningEnrollments.courseId, course.id)),
    )
    .leftJoin(learningCertificates, eq(learningCertificates.enrollmentId, learningEnrollments.id))
    .where(filter)
    .orderBy(desc(learningLearners.createdAt))
    .limit(200);

  const enrollmentIds = rows.map((row) => row.enrollmentId).filter((id): id is string => Boolean(id));
  const passedByEnrollment = new Map<string, number>();
  const examByEnrollment = new Map<string, { passed: boolean; percentage: number | null }>();

  if (enrollmentIds.length > 0) {
    const quizRows = await db
      .select({
        enrollmentId: learningQuizAttempts.enrollmentId,
        moduleNumber: learningModules.moduleNumber,
      })
      .from(learningQuizAttempts)
      .innerJoin(learningModules, eq(learningModules.id, learningQuizAttempts.moduleId))
      .where(and(inArray(learningQuizAttempts.enrollmentId, enrollmentIds), eq(learningQuizAttempts.passed, true)));

    const distinct = new Map<string, Set<number>>();
    for (const row of quizRows) {
      const set = distinct.get(row.enrollmentId) ?? new Set<number>();
      set.add(row.moduleNumber);
      distinct.set(row.enrollmentId, set);
    }
    for (const [enrollmentId, set] of distinct) {
      passedByEnrollment.set(enrollmentId, set.size);
    }

    const examRows = await db
      .select({
        enrollmentId: learningExamAttempts.enrollmentId,
        passed: learningExamAttempts.passed,
        percentage: learningExamAttempts.percentage,
        submittedAt: learningExamAttempts.submittedAt,
      })
      .from(learningExamAttempts)
      .where(inArray(learningExamAttempts.enrollmentId, enrollmentIds))
      .orderBy(desc(learningExamAttempts.submittedAt));

    for (const row of examRows) {
      if (!row.submittedAt) continue;
      if (examByEnrollment.has(row.enrollmentId)) continue;
      examByEnrollment.set(row.enrollmentId, {
        passed: row.passed === true,
        percentage: row.percentage == null ? null : Number(row.percentage),
      });
    }
  }

  return rows.map((row) => {
    const exam = row.enrollmentId ? examByEnrollment.get(row.enrollmentId) : undefined;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      roleName: row.roleName,
      createdAt: row.createdAt,
      enrollmentId: row.enrollmentId,
      startedAt: row.startedAt,
      lastAccessedAt: row.lastAccessedAt,
      completedAt: row.completedAt,
      modulesPassed: row.enrollmentId ? (passedByEnrollment.get(row.enrollmentId) ?? 0) : 0,
      examPassed: exam?.passed ?? false,
      examPercentage: exam?.percentage ?? null,
      certificateCode: row.certificateCode,
      certificateIssuedAt: row.certificateIssuedAt,
    };
  });
}

export async function adminOverviewStats() {
  const dashboard = await getAdminDashboard();
  return {
    learnerCount: dashboard.learnerCount,
    enrolledCount: dashboard.enrolledCount,
    certificateCount: dashboard.certificateCount,
    voucherCount: dashboard.voucherCount,
    couponCount: dashboard.couponCount,
    moduleCount: dashboard.moduleCount,
    courseTitle: dashboard.courseTitle,
  };
}

export type AdminDashboard = {
  courseTitle: string;
  moduleCount: number;
  learnerCount: number;
  enrolledCount: number;
  activeLast7Days: number;
  activeLast30Days: number;
  certificateCount: number;
  examPassedCount: number;
  avgProgressPercent: number;
  voucherCount: number;
  couponCount: number;
  progressBuckets: Array<{ label: string; value: number; color: string }>;
  enrollmentTrend: Array<{ label: string; enrolled: number }>;
  learners: AdminLearnerRow[];
};

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const course = await primaryCourse();
  const moduleCount = MODULE_COUNT;
  const learners = await listAdminLearners("");

  const [vouchers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(learningPromoCodes)
    .where(eq(learningPromoCodes.kind, "voucher"));
  const [coupons] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(learningPromoCodes)
    .where(eq(learningPromoCodes.kind, "coupon"));

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let activeLast7Days = 0;
  let activeLast30Days = 0;
  let certificateCount = 0;
  let examPassedCount = 0;
  let progressSum = 0;
  let enrolledCount = 0;
  const buckets = {
    none: 0,
    early: 0,
    mid: 0,
    late: 0,
    almost: 0,
    done: 0,
  };

  for (const row of learners) {
    const percent = Math.round((row.modulesPassed / Math.max(moduleCount, 1)) * 100);
    if (row.enrollmentId) {
      enrolledCount += 1;
      progressSum += percent;
      if (row.lastAccessedAt) {
        const age = now - new Date(row.lastAccessedAt).getTime();
        if (age <= 7 * day) activeLast7Days += 1;
        if (age <= 30 * day) activeLast30Days += 1;
      }
      if (row.certificateCode) certificateCount += 1;
      if (row.examPassed) examPassedCount += 1;
      if (percent <= 0) buckets.none += 1;
      else if (percent <= 25) buckets.early += 1;
      else if (percent <= 50) buckets.mid += 1;
      else if (percent <= 75) buckets.late += 1;
      else if (percent < 100) buckets.almost += 1;
      else buckets.done += 1;
    }
  }

  const enrollmentTrend: Array<{ label: string; enrolled: number }> = [];
  if (course) {
    const weeks = 8;
    const starts = await db
      .select({ startedAt: learningEnrollments.startedAt })
      .from(learningEnrollments)
      .where(eq(learningEnrollments.courseId, course.id));

    for (let i = weeks - 1; i >= 0; i -= 1) {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const count = starts.filter((row) => {
        const at = new Date(row.startedAt).getTime();
        return at >= start.getTime() && at <= end.getTime();
      }).length;
      enrollmentTrend.push({
        label: start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        enrolled: count,
      });
    }
  }

  return {
    courseTitle: course?.title ?? "DPDP Act Training",
    moduleCount,
    learnerCount: learners.length,
    enrolledCount,
    activeLast7Days,
    activeLast30Days,
    certificateCount,
    examPassedCount,
    avgProgressPercent: enrolledCount ? Math.round(progressSum / enrolledCount) : 0,
    voucherCount: Number(vouchers?.count ?? 0),
    couponCount: Number(coupons?.count ?? 0),
    progressBuckets: [
      { label: "Not started", value: buckets.none, color: "#94A3B8" },
      { label: "1–25%", value: buckets.early, color: "#38BDF8" },
      { label: "26–50%", value: buckets.mid, color: "#00C4A7" },
      { label: "51–75%", value: buckets.late, color: "#0B2C4A" },
      { label: "76–99%", value: buckets.almost, color: "#F59E0B" },
      { label: "Complete", value: buckets.done, color: "#059669" },
    ],
    enrollmentTrend,
    learners,
  };
}

export async function listPromoCodes(kind: "voucher" | "coupon") {
  return db
    .select()
    .from(learningPromoCodes)
    .where(eq(learningPromoCodes.kind, kind))
    .orderBy(desc(learningPromoCodes.createdAt))
    .limit(200);
}

export async function createPromoCode(input: {
  kind: "voucher" | "coupon";
  label?: string;
  discountPercent?: number;
  maxRedemptions?: number | null;
  expiresAt?: Date | null;
  note?: string | null;
  createdBy?: string;
}) {
  const code = input.kind === "voucher" ? generateVoucherCode() : generateCouponCode();
  const discountPercent =
    input.kind === "voucher"
      ? 100
      : Math.min(100, Math.max(1, Math.round(input.discountPercent ?? 10)));

  const [row] = await db
    .insert(learningPromoCodes)
    .values({
      kind: input.kind,
      code,
      label: (input.label ?? "").trim().slice(0, 160),
      discountPercent,
      maxRedemptions: input.maxRedemptions ?? null,
      expiresAt: input.expiresAt ?? null,
      note: input.note?.trim() || null,
      createdBy: input.createdBy ?? "admin",
      active: true,
    })
    .returning();
  return row;
}

export async function setPromoCodeActive(id: string, active: boolean) {
  const [row] = await db
    .update(learningPromoCodes)
    .set({ active, updatedAt: new Date() })
    .where(eq(learningPromoCodes.id, id))
    .returning();
  return row ?? null;
}

export async function listAdminCertificates() {
  return db
    .select({
      id: learningCertificates.id,
      certificateCode: learningCertificates.certificateCode,
      learnerName: learningCertificates.learnerName,
      courseTitle: learningCertificates.courseTitle,
      scorePercent: learningCertificates.scorePercent,
      completedAt: learningCertificates.completedAt,
      issuedAt: learningCertificates.issuedAt,
      learnerEmail: learningLearners.email,
      learnerId: learningLearners.id,
      examAttemptId: learningCertificates.examAttemptId,
    })
    .from(learningCertificates)
    .innerJoin(learningLearners, eq(learningLearners.id, learningCertificates.learnerId))
    .orderBy(desc(learningCertificates.issuedAt))
    .limit(200);
}

/**
 * Issue (or refresh) a certificate for a learner enrollment.
 * Uses the latest passed exam when available; otherwise admin-issued with the given score.
 */
export async function adminIssueCertificate(input: {
  learnerId: string;
  scorePercent?: number;
  learnerName?: string;
}) {
  const course = await primaryCourse();
  if (!course) return { error: "no_course" as const, message: "No learning course is configured." };

  const [learner] = await db
    .select()
    .from(learningLearners)
    .where(eq(learningLearners.id, input.learnerId))
    .limit(1);
  if (!learner) return { error: "not_found" as const, message: "Learner not found." };

  let [enrollment] = await db
    .select()
    .from(learningEnrollments)
    .where(and(eq(learningEnrollments.learnerId, learner.id), eq(learningEnrollments.courseId, course.id)))
    .limit(1);

  if (!enrollment) {
    const [created] = await db
      .insert(learningEnrollments)
      .values({ learnerId: learner.id, courseId: course.id, completedAt: new Date() })
      .returning();
    enrollment = created!;
  }

  const [exam] = await db
    .select()
    .from(learningExamAttempts)
    .where(
      and(
        eq(learningExamAttempts.enrollmentId, enrollment.id),
        eq(learningExamAttempts.passed, true),
      ),
    )
    .orderBy(desc(learningExamAttempts.submittedAt))
    .limit(1);

  const scorePercent = Math.min(
    100,
    Math.max(1, Math.round(exam?.percentage ?? input.scorePercent ?? 80)),
  );
  const learnerName = (input.learnerName ?? learner.name).trim() || learner.email;
  const completedAt = exam?.submittedAt ?? enrollment.completedAt ?? new Date();
  const code = `CG-DPDP-${randomBytes(5).toString("hex").toUpperCase()}`;

  const existing = await db
    .select({ id: learningCertificates.id })
    .from(learningCertificates)
    .where(eq(learningCertificates.enrollmentId, enrollment.id))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(learningCertificates)
      .set({
        examAttemptId: exam?.id ?? null,
        certificateCode: code,
        learnerName,
        courseTitle: course.title,
        scorePercent,
        completedAt,
        issuedAt: new Date(),
      })
      .where(eq(learningCertificates.id, existing[0].id))
      .returning();
    return {
      error: null,
      certificate: updated,
      programLine: CERTIFICATE_PROGRAM_LINE,
      verificationPath: `/learning/verify/${updated!.certificateCode}`,
    };
  }

  const [created] = await db
    .insert(learningCertificates)
    .values({
      enrollmentId: enrollment.id,
      learnerId: learner.id,
      courseId: course.id,
      examAttemptId: exam?.id ?? null,
      certificateCode: code,
      learnerName,
      courseTitle: course.title,
      scorePercent,
      completedAt,
    })
    .returning();

  if (!enrollment.completedAt) {
    await db
      .update(learningEnrollments)
      .set({ completedAt: completedAt })
      .where(eq(learningEnrollments.id, enrollment.id));
  }

  return {
    error: null,
    certificate: created,
    programLine: CERTIFICATE_PROGRAM_LINE,
    verificationPath: `/learning/verify/${created!.certificateCode}`,
  };
}

export async function moduleCount() {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(learningModules);
  return Number(row?.count ?? MODULE_COUNT);
}
