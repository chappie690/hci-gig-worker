"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { useDemoSubscription } from "@/components/settings/subscription-access";
import { Button } from "@/components/ui/button";
import { formatSubscriptionPrice, getLearnerPlanAccess, getPlansForRole } from "@/lib/subscriptions";

type QuizResult = {
  score: number;
  total: number;
  percentage: number;
  passed?: boolean;
  certificateId?: string;
  completedAt: string;
};

type CertificateCopy = {
  achievementStatement: string;
  themeName: string;
  sealText: string;
};

type CertificateCourse = {
  id: string;
  title: string;
  trainerName: string;
  trainerEmail?: string;
};

const passingScore = 8;

export function CertificateViewer({
  course,
  learner
}: {
  course: CertificateCourse;
  learner: { fullName: string; email: string };
}) {
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [copy, setCopy] = useState<CertificateCopy>(() => fallbackCopy(course.title));
  const { subscription } = useDemoSubscription(learner.email, "LEARNER");
  const passed = Boolean(quizResult && quizResult.score >= passingScore);
  const certificateAccess = getLearnerPlanAccess(subscription.planName).certificates;
  const certificateId = quizResult?.certificateId ?? buildCertificateId(course.id);
  const completionDate = quizResult ? new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(quizResult.completedAt)) : "";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = readQuizResult(course.id);
      setQuizResult(result);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [course.id]);

  useEffect(() => {
    if (!passed || !quizResult) {
      return;
    }

    const controller = new AbortController();
    fetch("/api/ai/certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        learnerName: learner.fullName,
        courseTitle: course.title,
        trainerName: course.trainerName,
        score: quizResult.score
      }),
      signal: controller.signal
    })
      .then((response) => response.json())
      .then((data) => setCopy({
        achievementStatement: typeof data?.achievementStatement === "string" ? data.achievementStatement : fallbackCopy(course.title).achievementStatement,
        themeName: typeof data?.themeName === "string" ? data.themeName : fallbackCopy(course.title).themeName,
        sealText: typeof data?.sealText === "string" ? data.sealText : fallbackCopy(course.title).sealText
      }))
      .catch(() => setCopy(fallbackCopy(course.title)));

    return () => controller.abort();
  }, [course.title, course.trainerName, learner.fullName, passed, quizResult]);

  const svgMarkup = useMemo(() => {
    if (!quizResult) {
      return "";
    }

    return buildCertificateSvg({
      learnerName: learner.fullName,
      courseTitle: course.title,
      trainerName: course.trainerName,
      completionDate,
      score: `${quizResult.score}/${quizResult.total}`,
      certificateId,
      copy
    });
  }, [certificateId, completionDate, copy, course.title, course.trainerName, learner.fullName, quizResult]);

  function downloadCertificate() {
    if (!svgMarkup) {
      return;
    }

    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${certificateId}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!quizResult || !passed) {
    return (
      <section className="rounded-3xl border border-ink/10 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Certificate locked</p>
        <h2 className="mt-3 text-3xl font-black text-ink dark:text-slate-100">Score at least 8/10 to unlock this certificate.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/65 dark:text-slate-300">
          You must pass the course quiz before SkillPilot AI can issue a certificate. Review your answers and retake the quiz when ready.
        </p>
        {quizResult ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">Latest score: {quizResult.score}/{quizResult.total}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={`/learner/course-player/${course.id}`}>Retake quiz</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/learner/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!certificateAccess) {
    const upgrade = getPlansForRole("LEARNER").find((plan) => plan.name === "Starter Learner");
    return (
      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-8 text-center shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">Certificate locked by plan</p>
        <h2 className="mt-3 text-3xl font-black text-blue-950 dark:text-blue-100">Certificates are not included on {subscription.planName}.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-blue-900/75 dark:text-blue-100/75">
          You passed with {quizResult.score}/{quizResult.total}, but certificate access requires {upgrade?.name ?? "Starter Learner"} at {formatSubscriptionPrice(upgrade?.price ?? 19)} or Pro Learner. No real billing occurs in this prototype.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/learner/settings">Upgrade plan</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/learner/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff,#ffffff_45%,#f5f3ff)] p-6 dark:border-slate-700 dark:bg-none">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">SkillPilot AI Certificate</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-slate-100">{copy.themeName}</h1>
        </div>

        <div className="relative p-8">
          <div className="absolute right-8 top-8 grid h-24 w-24 place-items-center rounded-full border-4 border-blue-200 bg-blue-600 text-center text-xs font-black uppercase tracking-[0.12em] text-white shadow-xl dark:border-blue-800">
            {copy.sealText}
          </div>
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">This certifies that</p>
            <div className="mt-4 flex items-center gap-4">
              <ProfileLogo user={learner} className="h-16 w-16" label={`${learner.fullName} certificate profile mark`} />
              <h2 className="text-4xl font-black text-slate-950 dark:text-slate-100">{learner.fullName}</h2>
            </div>
            <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">has successfully completed</p>
            <p className="mt-3 text-3xl font-black text-blue-700 dark:text-blue-300">{course.title}</p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">{copy.achievementStatement}</p>
          </div>

          <div className="mt-10 grid gap-4 border-t border-slate-200 pt-6 text-sm md:grid-cols-4 dark:border-slate-700">
            <Meta label="Trainer" value={course.trainerName} />
            <Meta label="Completion date" value={completionDate} />
            <Meta label="Score" value={`${quizResult.score}/${quizResult.total}`} />
            <Meta label="Certificate ID" value={certificateId} />
          </div>

          <div className="mt-8 flex items-end justify-between gap-6">
            <div>
              <p className="font-serif text-2xl italic text-slate-950 dark:text-slate-100">{course.trainerName}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Trainer signature</p>
            </div>
            <ProfileLogo user={{ fullName: course.trainerName, email: course.trainerEmail }} className="h-14 w-14" label={`${course.trainerName} trainer logo`} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={downloadCertificate}>Download Certificate</Button>
        <Button asChild variant="secondary">
          <Link href={`/learner/course-player/${course.id}`}>Back to Course</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/learner/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 font-black text-slate-950 dark:text-slate-100">{value}</p>
    </div>
  );
}

function readQuizResult(courseId: string): QuizResult | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem("skillpilot-course-quiz-scores") ?? "{}") as Record<string, QuizResult>;
    const result = saved[courseId];

    if (!result) {
      return null;
    }

    return {
      ...result,
      passed: result.score >= passingScore,
      certificateId: result.certificateId ?? buildCertificateId(courseId)
    };
  } catch {
    window.localStorage.removeItem("skillpilot-course-quiz-scores");
    return null;
  }
}

function buildCertificateId(courseId: string) {
  return `SP-CERT-${courseId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}-${new Date().getFullYear()}`;
}

function fallbackCopy(courseTitle: string): CertificateCopy {
  return {
    achievementStatement: `For successfully demonstrating applied understanding, practical decision-making, and confident skill readiness in ${courseTitle}.`,
    themeName: "Professional AI Skills Credential",
    sealText: "AI Certified"
  };
}

function escapeSvg(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildCertificateSvg({
  learnerName,
  courseTitle,
  trainerName,
  completionDate,
  score,
  certificateId,
  copy
}: {
  learnerName: string;
  courseTitle: string;
  trainerName: string;
  completionDate: string;
  score: string;
  certificateId: string;
  copy: CertificateCopy;
}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="980" viewBox="0 0 1400 980">
  <rect width="1400" height="980" fill="#f8fafc"/>
  <rect x="58" y="58" width="1284" height="864" rx="30" fill="#ffffff" stroke="#1d4ed8" stroke-width="6"/>
  <rect x="92" y="92" width="1216" height="796" rx="22" fill="none" stroke="#bfdbfe" stroke-width="3"/>
  <circle cx="1120" cy="245" r="92" fill="#2563eb"/>
  <circle cx="1120" cy="245" r="74" fill="none" stroke="#dbeafe" stroke-width="6"/>
  <text x="1120" y="238" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#ffffff">${escapeSvg(copy.sealText)}</text>
  <text x="700" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="6" fill="#1d4ed8">SKILLPILOT AI</text>
  <text x="700" y="215" text-anchor="middle" font-family="Georgia, serif" font-size="54" font-weight="700" fill="#0f172a">${escapeSvg(copy.themeName)}</text>
  <text x="700" y="290" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="4" fill="#64748b">THIS CERTIFIES THAT</text>
  <text x="700" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="68" font-weight="700" fill="#0f172a">${escapeSvg(learnerName)}</text>
  <text x="700" y="452" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="4" fill="#64748b">HAS SUCCESSFULLY COMPLETED</text>
  <text x="700" y="525" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="#1d4ed8">${escapeSvg(courseTitle)}</text>
  <foreignObject x="245" y="565" width="910" height="110">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:24px;line-height:1.5;color:#475569;text-align:center;">${escapeSvg(copy.achievementStatement)}</div>
  </foreignObject>
  <line x1="190" y1="755" x2="520" y2="755" stroke="#94a3b8" stroke-width="2"/>
  <text x="355" y="795" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-style="italic" fill="#0f172a">${escapeSvg(trainerName)}</text>
  <text x="355" y="825" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="#64748b">TRAINER SIGNATURE</text>
  <text x="875" y="745" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#0f172a">Completion Date: ${escapeSvg(completionDate)}</text>
  <text x="875" y="790" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#0f172a">Score: ${escapeSvg(score)}</text>
  <text x="875" y="835" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#64748b">Certificate ID: ${escapeSvg(certificateId)}</text>
</svg>`;
}
