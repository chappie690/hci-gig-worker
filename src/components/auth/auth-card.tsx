import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  footer,
  children
}: {
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-cloud px-6 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-5 block text-center text-sm font-bold uppercase tracking-[0.18em] text-moss">
          SkillPilot AI
        </Link>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm leading-6 text-ink/65 dark:text-slate-300">{description}</p>
          </CardHeader>
          <CardContent>
            {children}
            <div className="mt-6 text-center text-sm text-ink/65 dark:text-slate-300">{footer}</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
