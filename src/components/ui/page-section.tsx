export function PageSection({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="mb-6 flex flex-col gap-4 border-b border-ink/10 pb-5 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-bold text-ink dark:text-slate-100">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65 dark:text-slate-300">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
