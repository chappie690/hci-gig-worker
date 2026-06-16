"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type MockMeetSession = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  sessionVideoUrl: string | null;
  status: string;
  learnerCount: number;
  courseTitle: string;
  trainerName: string;
  returnHref: string;
};

export function MockMeetRoom({ session }: { session: MockMeetSession }) {
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  return (
    <main className="min-h-screen bg-[#111418] text-slate-100">
      <header className="border-b border-white/10 bg-[#202124] px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-blue-500 text-sm font-black text-white">
              M
            </span>
            <div>
              <p className="text-sm font-black">SkillPilot Mock Google Meet</p>
              <p className="text-xs text-slate-400">This is a mock training session.</p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link href={session.returnHref}>Leave</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
          {session.sessionVideoUrl ? (
            <iframe
              className="aspect-video w-full"
              src={session.sessionVideoUrl}
              title={`${session.title} session video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="grid aspect-video place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.35),transparent_28%),linear-gradient(135deg,#020617,#111827)] p-8 text-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">Live training room</p>
                <h1 className="mt-4 text-4xl font-black text-white">{session.title}</h1>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  Video placeholder active. If the trainer adds a YouTube session link, it appears here.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-white/10 bg-[#202124] p-5 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Session details</p>
          <h2 className="mt-3 text-2xl font-black text-white">{session.title}</h2>
          <div className="mt-5 grid gap-3">
            <Info label="Course" value={session.courseTitle} />
            <Info label="Trainer" value={session.trainerName} />
            <Info label="Learners" value={`${session.learnerCount} invited`} />
            <Info label="Date/time" value={formatDateRange(session.startTime, session.endTime)} />
            <Info label="Status" value={session.status.toLowerCase()} />
          </div>
        </aside>
      </section>

      <footer className="sticky bottom-0 border-t border-white/10 bg-[#202124]/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3">
          <ControlButton active={muted} label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((value) => !value)} />
          <ControlButton active={cameraOff} label={cameraOff ? "Turn camera on" : "Camera"} onClick={() => setCameraOff((value) => !value)} />
          <Link
            href={session.returnHref}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-600 px-6 py-2 text-sm font-black text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
          >
            Leave
          </Link>
        </div>
      </footer>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-100">{value}</p>
    </div>
  );
}

function ControlButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={active ? "min-h-11 rounded-full bg-blue-600 px-5 py-2 text-sm font-black text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300" : "min-h-11 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-black text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function formatDateRange(start: string, end: string) {
  const date = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(start));
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  return `${date}, ${time.format(new Date(start))} - ${time.format(new Date(end))}`;
}
