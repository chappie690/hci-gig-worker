"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type WorkflowResult = {
  workflowName: string;
  trigger: string;
  action: string;
  messageTemplate: string;
  reason: string;
  expectedOutcome: string;
  riskNote: string;
  workflowSuggestions: string[];
  automationSummary: string;
};

type AutomationLog = {
  id: string;
  workflowName: string;
  enabled: boolean;
  createdAt: string;
};

const triggers = ["learner joins course", "inactive learner", "course completed", "payment pending", "session soon", "review missing"] as const;
const actions = ["welcome message", "reminder", "payment reminder", "session reminder", "feedback request", "certificate ready", "notify trainer"] as const;
const logKey = "skillpilot-automation-workflow-logs";

export function AutomationWorkflowBuilder() {
  const [trigger, setTrigger] = useState<(typeof triggers)[number]>("inactive learner");
  const [action, setAction] = useState<(typeof actions)[number]>("reminder");
  const [goal, setGoal] = useState("Bring learners back to the course with a short, useful reminder.");
  const [audience, setAudience] = useState("AI micro-course learners");
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(logKey) ?? "[]");
        setLogs(Array.isArray(parsed) ? parsed : []);
      } catch {
        setLogs([]);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function generateWorkflow() {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/ai/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskType: action.includes("payment") ? "EMAIL_REMINDER" : "SESSION_REMINDER",
        trigger,
        action,
        goal,
        audience
      })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage({ type: "error", text: data?.message ?? "SkillPilot hit some turbulence while building the workflow." });
      return;
    }

    setResult(data.automation ?? data);
    setEnabled(false);
    setMessage({ type: "success", text: "Workflow preview generated. Review the risk note before enabling." });
  }

  function toggleEnabled() {
    if (!result) {
      return;
    }

    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    const nextLogs = [
      {
        id: `workflow-log-${Date.now()}`,
        workflowName: result.workflowName,
        enabled: nextEnabled,
        createdAt: new Date().toISOString()
      },
      ...logs
    ];
    setLogs(nextLogs);
    window.localStorage.setItem(logKey, JSON.stringify(nextLogs));
    setMessage({ type: "success", text: nextEnabled ? "Workflow enabled for this demo." : "Workflow disabled. No real messages were sent." });
  }

  async function copyWorkflow() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(formatWorkflow(result));
    setMessage({ type: "success", text: "Workflow preview copied." });
  }

  return (
    <section className="mb-6 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">AI workflow builder</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Design safe trainer automations</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
            Choose a trigger and action. Groq suggests copy and logic, while SkillPilot keeps real sending, payments, and posting under app control.
          </p>
        </div>
        <Badge className={enabled ? "bg-emerald-50 text-emerald-700" : "bg-cloud text-ink/70"}>{enabled ? "enabled" : "preview"}</Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <Select label="Trigger" value={trigger} options={triggers} onChange={(value) => setTrigger(value as typeof trigger)} />
        <Select label="Action" value={action} options={actions} onChange={(value) => setAction(value as typeof action)} />
        <label className="grid gap-2 text-sm font-semibold text-ink lg:col-span-2">
          Goal
          <input className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={goal} onChange={(event) => setGoal(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink lg:col-span-2">
          Audience
          <input className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={audience} onChange={(event) => setAudience(event.target.value)} />
        </label>
        <div className="flex flex-wrap items-end gap-2 lg:col-span-2">
          <Button type="button" onClick={generateWorkflow} disabled={loading || goal.trim().length < 8}>
            {loading ? "Building workflow..." : "Generate workflow"}
          </Button>
          <Button type="button" variant="secondary" onClick={copyWorkflow} disabled={!result}>
            Copy preview
          </Button>
          <Button type="button" variant="secondary" onClick={toggleEnabled} disabled={!result}>
            {enabled ? "Disable" : "Enable demo"}
          </Button>
        </div>
      </div>

      {message ? (
        <p className={message.type === "success" ? "mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700" : "mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"} aria-live="polite">
          {message.text}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Result label="Workflow name" value={result.workflowName} />
          <Result label="Trigger" value={result.trigger} />
          <Result label="Action" value={result.action} />
          <Result label="Message template" value={result.messageTemplate} />
          <Result label="Reason" value={result.reason} />
          <Result label="Expected outcome" value={result.expectedOutcome} />
          <Result label="Risk note" value={result.riskNote} />
          <Result label="Workflow suggestions" value={result.workflowSuggestions.map((item) => `- ${item}`).join("\n")} />
          <Result label="Automation summary" value={result.automationSummary} />
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-ink/10 bg-cloud p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">Automation logs</p>
        <div className="mt-3 grid gap-2">
          {logs.slice(0, 4).map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
              <span className="font-semibold text-ink">{log.workflowName}</span>
              <span className="text-ink/55">{log.enabled ? "Enabled" : "Disabled"} at {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}</span>
            </div>
          ))}
          {logs.length === 0 ? <p className="text-sm text-ink/60">No workflow toggles yet.</p> : null}
        </div>
      </div>
    </section>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <select className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-moss focus:ring-4 focus:ring-limewash" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-ink/10 bg-cloud p-4 transition hover:-translate-y-0.5 hover:shadow-soft motion-reduce:hover:translate-y-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/70">{value}</p>
    </article>
  );
}

function formatWorkflow(result: WorkflowResult) {
  return [
    ["Workflow name", result.workflowName],
    ["Trigger", result.trigger],
    ["Action", result.action],
    ["Message template", result.messageTemplate],
    ["Reason", result.reason],
    ["Expected outcome", result.expectedOutcome],
    ["Risk note", result.riskNote]
  ].map(([label, value]) => `${label}\n${value}`).join("\n\n");
}
