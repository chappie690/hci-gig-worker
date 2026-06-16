"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ReviewForm } from "@/components/learner/review-form";
import { ProfileLogo } from "@/components/profile/profile-logo";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

type Question = {
  question: string;
  options: string[];
  answerIndex: number;
};

type SavedQuizResult = {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  certificateId?: string;
  completedAt: string;
  answers: Record<number, number>;
};

const passingScore = 8;

export function CoursePlayer({
  course
}: {
  course: {
    id: string;
    title: string;
    topic: string;
    trainerName: string;
    description: string;
    courseVideoUrl?: string | null;
    progress: number;
    enrollmentId: string | null;
    learnerName: string;
    learnerEmail: string;
  };
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<SavedQuizResult | null>(() => readSavedQuizResult(course.id));
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(() => {
    if (typeof window === "undefined" || course.enrollmentId) {
      return course.progress;
    }

    try {
      const stored = JSON.parse(window.localStorage.getItem("skillpilot-stock-course-progress") ?? "{}") as Record<string, number>;
      if (typeof stored[course.id] === "number") {
        return stored[course.id];
      }
    } catch {
      window.localStorage.removeItem("skillpilot-stock-course-progress");
    }

    return course.progress;
  });

  useEffect(() => {
    async function loadQuiz() {
      const response = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, title: course.title, topic: course.topic })
      });
      const data = await response.json().catch(() => null);
      setQuestions(Array.isArray(data?.questions) ? data.questions : []);
      setLoading(false);
    }

    loadQuiz();
  }, [course.id, course.title, course.topic]);

  async function completeCourse() {
    const correct = questions.reduce((sum, question, index) => sum + (answers[index] === question.answerIndex ? 1 : 0), 0);
    const percentage = Math.round((correct / questions.length) * 100);
    const passed = correct >= passingScore;
    const result = {
      score: correct,
      total: questions.length,
      percentage,
      passed,
      certificateId: passed ? buildCertificateId(course.id) : undefined,
      completedAt: new Date().toISOString(),
      answers
    };
    setQuizResult(result);
    saveQuizResult(course.id, result);

    if (!passed) {
      return;
    }

    setProgress(100);

    if (course.enrollmentId) {
      await fetch(`/api/learner/enrollments/${course.enrollmentId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: 100 })
      });
    } else {
      const key = "skillpilot-stock-course-progress";
      const current = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, number>;
      window.localStorage.setItem(key, JSON.stringify({ ...current, [course.id]: 100 }));
    }
  }

  function retryQuiz() {
    setQuizResult(null);
    setAnswers({});
    removeQuizResult(course.id);
  }

  const displayedAnswers = quizResult?.answers ?? answers;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.45fr]">
      <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Mock course website</p>
        <h2 className="mt-3 text-3xl font-black text-ink dark:text-slate-100">{course.title}</h2>
        <p className="mt-2 text-sm font-semibold text-moss">{course.trainerName}</p>
        <p className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
          Topic: {course.topic}
        </p>
        <p className="mt-4 text-sm leading-6 text-ink/65 dark:text-slate-300">{course.description}</p>
        <div className="mt-6 rounded-2xl bg-cloud p-5 dark:bg-slate-900">
          <p className="text-sm font-bold text-ink dark:text-slate-100">Course video</p>
          {course.courseVideoUrl ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm dark:border-slate-700">
              <iframe
                className="aspect-video w-full"
                src={course.courseVideoUrl}
                title={`${course.title} YouTube course video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="mt-4 grid aspect-video place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-950 text-sm font-bold text-white dark:border-slate-700">
              No trainer video added yet.
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <p className="text-sm font-bold text-ink dark:text-slate-100">Course progress</p>
        <p className="mt-2 text-4xl font-black text-ink dark:text-slate-100">{progress}%</p>
        <Progress className="mt-4 h-3" value={progress} />
        {quizResult ? (
          <div className={cn("mt-4 rounded-2xl border p-4", quizResult.passed ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/40" : "border-amber-200 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/40")}>
            <p className={cn("text-sm font-black", quizResult.passed ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200")}>You scored {quizResult.score}/{quizResult.total}</p>
            <p className={cn("mt-1 text-sm font-semibold", quizResult.passed ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>Marks: {quizResult.percentage}%</p>
            <p className={cn("mt-1 text-xs font-bold uppercase tracking-[0.14em]", quizResult.passed ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
              {quizResult.passed ? "Passed and completed" : "Not passed yet"}
            </p>
            {!quizResult.passed ? <p className="mt-3 text-sm font-semibold text-amber-800 dark:text-amber-200">You need at least 8/10 to pass. Please review and try again.</p> : null}
          </div>
        ) : null}
        {quizResult?.passed ? (
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center dark:border-emerald-900/70 dark:bg-emerald-950/40">
            <ProfileLogo user={{ fullName: course.learnerName, email: course.learnerEmail }} className="mx-auto h-16 w-16" label={`${course.learnerName} certificate logo`} />
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Certificate unlocked</p>
            <p className="mt-2 text-sm font-black text-ink dark:text-slate-100">{course.learnerName}</p>
            <p className="mt-1 text-xs text-ink/60 dark:text-slate-300">Completed {course.title}</p>
            <Button asChild className="mt-4 w-full">
              <Link href={`/learner/certificate/${course.id}`}>View Certificate</Link>
            </Button>
          </div>
        ) : null}
        <Button asChild variant="secondary" className="mt-5 w-full">
          <Link href="/learner/courses">Return to My Courses</Link>
        </Button>
      </aside>

      <section className="xl:col-span-2 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <h3 className="text-2xl font-black text-ink dark:text-slate-100">Course quiz</h3>
        <p className="mt-2 text-sm text-ink/60 dark:text-slate-300">These 10 questions are generated from this course&apos;s title and topic, so each course gets its own practice set.</p>
        {loading ? <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">Brewing course questions...</p> : null}
        {quizResult ? (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/70 dark:bg-blue-950/40">
            <p className="font-black text-blue-800 dark:text-blue-200">Quiz completed: {quizResult.score}/{quizResult.total}</p>
            <p className="mt-1 text-sm font-semibold text-blue-700 dark:text-blue-300">Marks attained: {quizResult.percentage}%</p>
            <p className="mt-1 text-sm font-semibold text-blue-700 dark:text-blue-300">Result: {quizResult.passed ? "Passed" : "Failed - retry available"}</p>
          </div>
        ) : null}
        <div className="mt-5 grid gap-4">
          {questions.map((question, index) => (
            <fieldset key={`${course.id}-${index}-${question.question}`} className="rounded-2xl border border-ink/10 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <legend className="px-1 font-bold text-ink dark:text-slate-100">{index + 1}. {question.question}</legend>
              <div className="mt-3 grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={option}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition",
                      "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                      "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800",
                      displayedAnswers[index] === optionIndex && "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-100",
                      quizResult && optionIndex === question.answerIndex && "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-100",
                      quizResult && displayedAnswers[index] === optionIndex && optionIndex !== question.answerIndex && "border-red-300 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950/50 dark:text-red-100"
                    )}
                  >
                    <input
                      type="radio"
                      name={`question-${index}`}
                      checked={displayedAnswers[index] === optionIndex}
                      disabled={Boolean(quizResult)}
                      onChange={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                    />
                    <span className="flex-1">{option}</span>
                    {quizResult && optionIndex === question.answerIndex ? <span className="text-xs font-black uppercase tracking-[0.12em]">Correct answer</span> : null}
                    {quizResult && displayedAnswers[index] === optionIndex && optionIndex !== question.answerIndex ? <span className="text-xs font-black uppercase tracking-[0.12em]">Your answer</span> : null}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        {quizResult ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {quizResult.passed ? (
              <Button asChild>
                <Link href={`/learner/certificate/${course.id}`}>View Certificate</Link>
              </Button>
            ) : (
              <Button type="button" onClick={retryQuiz}>
                Retry quiz
              </Button>
            )}
            <Button asChild variant="secondary">
              <Link href="/learner/dashboard">Return to dashboard</Link>
            </Button>
          </div>
        ) : (
          <Button className="mt-6" type="button" onClick={completeCourse} disabled={questions.length !== 10 || Object.keys(answers).length < 10}>
            Submit quiz and complete course
          </Button>
        )}
      </section>

      <div className="xl:col-span-2">
        <ReviewForm
          courseId={course.id}
          courseTitle={course.title}
          trainerName={course.trainerName}
          learnerName={course.learnerName}
        />
      </div>
    </div>
  );
}

function readSavedQuizResult(courseId: string): SavedQuizResult | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = JSON.parse(window.localStorage.getItem("skillpilot-course-quiz-scores") ?? "{}") as Record<string, SavedQuizResult>;
    const result = saved[courseId];
    if (!result) {
      return null;
    }

    return {
      ...result,
      passed: typeof result.passed === "boolean" ? result.passed : result.score >= passingScore,
      certificateId: result.certificateId ?? (result.score >= passingScore ? buildCertificateId(courseId) : undefined)
    };
  } catch {
    window.localStorage.removeItem("skillpilot-course-quiz-scores");
    return null;
  }
}

function saveQuizResult(courseId: string, result: SavedQuizResult) {
  try {
    const key = "skillpilot-course-quiz-scores";
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, SavedQuizResult>;
    window.localStorage.setItem(key, JSON.stringify({ ...saved, [courseId]: result }));
  } catch {
    // Quiz completion should never fail just because browser storage is full.
  }
}

function removeQuizResult(courseId: string) {
  try {
    const key = "skillpilot-course-quiz-scores";
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, SavedQuizResult>;
    delete saved[courseId];
    window.localStorage.setItem(key, JSON.stringify(saved));
  } catch {
    window.localStorage.removeItem("skillpilot-course-quiz-scores");
  }
}

function buildCertificateId(courseId: string) {
  return `SP-CERT-${courseId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}-${new Date().getFullYear()}`;
}
