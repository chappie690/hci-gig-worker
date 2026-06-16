import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";

const requestSchema = z.object({
  role: z.enum(["LEARNER", "TRAINER"]).optional()
});

type MockBrandingKit = {
  brandName: string;
  tagline: string;
  shortBio: string;
  portfolioSummary: string;
  logoConcept: string;
  logoPrompt: string;
  colorPalette: string[];
  fontStyle: string;
  socialMediaBio: string;
  profileHeadline: string;
  skillsSummary: string;
};

const trainerKits: MockBrandingKit[] = [
  {
    brandName: "PromptPilot Studio",
    tagline: "Practical AI training for teams that need results.",
    shortBio: "I help professionals turn AI curiosity into repeatable workflows through focused micro-courses and live coaching.",
    portfolioSummary: "Portfolio includes prompt libraries, AI workflow audits, course design, and trainer-led sessions for business teams adopting generative AI.",
    logoConcept: "A navigation arrow blended with a neural spark to represent guided AI learning.",
    logoPrompt: "Modern SaaS logo for PromptPilot Studio, navigation arrow, neural spark, blue and violet gradient, crisp white background.",
    colorPalette: ["#2563EB", "#7C3AED", "#0F172A", "#F8FAFC"],
    fontStyle: "Inter for clean training UI with Manrope for confident headings.",
    socialMediaBio: "AI trainer helping teams build practical prompt systems and automation habits.",
    profileHeadline: "AI Trainer | Prompt Systems Coach | Course Creator",
    skillsSummary: "Prompt engineering, workflow automation, learner coaching, course design, AI adoption."
  },
  {
    brandName: "Workflow Mentor AI",
    tagline: "AI coaching for smarter operations and faster learning.",
    shortBio: "I design hands-on AI courses that help learners automate routine work, evaluate outputs, and build confidence with modern tools.",
    portfolioSummary: "Training portfolio spans operations automation, AI productivity workshops, chatbot planning, and guided implementation labs.",
    logoConcept: "Layered workflow cards orbiting a subtle AI compass.",
    logoPrompt: "Professional logo for Workflow Mentor AI, layered workflow cards, AI compass, slate, cyan, and purple palette.",
    colorPalette: ["#0891B2", "#6366F1", "#111827", "#ECFEFF"],
    fontStyle: "Plus Jakarta Sans for polished SaaS warmth.",
    socialMediaBio: "Helping learners turn AI tools into dependable work systems.",
    profileHeadline: "AI Workflow Coach for Operations Teams",
    skillsSummary: "Workflow mapping, AI productivity, automation strategy, chatbot foundations, training facilitation."
  },
  {
    brandName: "LearnerLift AI",
    tagline: "Micro-courses that make AI feel usable.",
    shortBio: "I create beginner-friendly AI training experiences with clear examples, supportive coaching, and portfolio-ready outcomes.",
    portfolioSummary: "Projects include beginner AI bootcamps, skills roadmaps, content automation lessons, and portfolio review sessions.",
    logoConcept: "An upward learning path with a small glowing AI node.",
    logoPrompt: "Friendly training brand logo for LearnerLift AI, upward path, glowing AI node, blue purple white palette.",
    colorPalette: ["#3B82F6", "#A855F7", "#1E293B", "#FFFFFF"],
    fontStyle: "Nunito Sans for approachable coaching with strong readable headings.",
    socialMediaBio: "AI course creator helping beginners build confidence and portfolio proof.",
    profileHeadline: "Beginner AI Trainer | Portfolio Coach | Micro-Course Creator",
    skillsSummary: "Beginner coaching, AI literacy, portfolio building, content creation, feedback design."
  },
  {
    brandName: "Automation Academy Lab",
    tagline: "Build useful AI systems, one workflow at a time.",
    shortBio: "I teach freelancers and teams how to design simple automation systems using AI prompts, no-code tools, and smart review habits.",
    portfolioSummary: "Portfolio highlights include AI automation templates, freelancing systems, learner playbooks, and practical implementation workshops.",
    logoConcept: "A modular automation grid with one highlighted pilot route.",
    logoPrompt: "SaaS training logo for Automation Academy Lab, modular grid, highlighted route, electric blue, purple, dark slate.",
    colorPalette: ["#1D4ED8", "#9333EA", "#020617", "#DBEAFE"],
    fontStyle: "IBM Plex Sans for technical credibility with friendly spacing.",
    socialMediaBio: "Teaching freelancers and teams to build AI automation workflows safely.",
    profileHeadline: "AI Automation Trainer for Freelancers and Teams",
    skillsSummary: "Automation workflows, prompt templates, freelancing systems, quality checks, no-code AI tools."
  },
  {
    brandName: "DataLabel Pro Coach",
    tagline: "Train smarter data workers for the AI economy.",
    shortBio: "I help gig workers build reliable AI data skills through practical labeling, QA, and productivity lessons.",
    portfolioSummary: "Training work covers data labeling basics, QA rubrics, annotation workflows, productivity systems, and learner progress coaching.",
    logoConcept: "A precise label tag connected to a clean AI grid.",
    logoPrompt: "Clean logo for DataLabel Pro Coach, label tag, AI grid, professional blue, emerald, slate palette.",
    colorPalette: ["#0EA5E9", "#10B981", "#0F172A", "#F0FDFA"],
    fontStyle: "Source Sans 3 for professional clarity and learner-friendly forms.",
    socialMediaBio: "Helping gig workers build reliable data labeling and AI QA skills.",
    profileHeadline: "AI Data Labeling Trainer | QA Coach",
    skillsSummary: "Data labeling, quality assurance, annotation workflows, AI gig readiness, learner coaching."
  },
  {
    brandName: "BrandBot Trainer",
    tagline: "AI marketing skills for creators and solo founders.",
    shortBio: "I train creators to use AI for branding, captions, campaign planning, and consistent content systems.",
    portfolioSummary: "Portfolio includes AI marketing micro-courses, caption frameworks, brand kit workshops, and campaign planning sessions.",
    logoConcept: "A chat bubble shaped like a brand spark.",
    logoPrompt: "Creative SaaS logo for BrandBot Trainer, chat bubble, brand spark, vivid blue, violet, white.",
    colorPalette: ["#2563EB", "#C026D3", "#111827", "#FAFAFA"],
    fontStyle: "Montserrat for bold creator energy with Inter for body copy.",
    socialMediaBio: "AI marketing trainer helping creators build sharper content systems.",
    profileHeadline: "AI Marketing Trainer | Branding Coach | Course Creator",
    skillsSummary: "AI marketing, branding, content systems, campaign planning, social copywriting."
  }
];

const learnerKits: MockBrandingKit[] = [
  {
    brandName: "AI Career Starter",
    tagline: "Building practical AI skills one project at a time.",
    shortBio: "I am growing my AI skill portfolio through focused courses, small projects, and consistent practice.",
    portfolioSummary: "Portfolio focus includes prompt practice, chatbot basics, AI productivity workflows, and beginner-friendly project reflections.",
    logoConcept: "Initials inside a bright launch badge with a small learning path.",
    logoPrompt: "Beginner-friendly personal brand logo, initials badge, launch path, blue and purple gradient.",
    colorPalette: ["#60A5FA", "#8B5CF6", "#1E293B", "#EFF6FF"],
    fontStyle: "Inter for clarity with rounded accent headings.",
    socialMediaBio: "Learning AI skills and building a beginner portfolio with SkillPilot AI.",
    profileHeadline: "Aspiring AI Gig Worker | Learning Prompt Engineering",
    skillsSummary: "Prompt basics, AI productivity, chatbot foundations, learning documentation."
  },
  {
    brandName: "Prompt Journey",
    tagline: "From beginner prompts to portfolio-ready projects.",
    shortBio: "I am learning how to use AI tools responsibly, document my progress, and turn lessons into practical examples.",
    portfolioSummary: "Portfolio includes prompt experiments, course notes, mini automations, and reflections on AI learning milestones.",
    logoConcept: "A stepping-stone path crossing a soft AI glow.",
    logoPrompt: "Personal learner logo for Prompt Journey, stepping-stone path, soft AI glow, friendly blue purple palette.",
    colorPalette: ["#38BDF8", "#A78BFA", "#334155", "#F8FAFC"],
    fontStyle: "Nunito Sans for friendly learner storytelling.",
    socialMediaBio: "Documenting my AI learning journey from first prompts to useful projects.",
    profileHeadline: "AI Learner | Prompt Practice | Portfolio Builder",
    skillsSummary: "Prompt writing, learning reflection, mini projects, AI tool confidence."
  },
  {
    brandName: "Future Skills Pilot",
    tagline: "Learning AI for better freelance opportunities.",
    shortBio: "I am building practical AI and digital work skills to prepare for freelance projects and gig opportunities.",
    portfolioSummary: "Portfolio direction includes AI content support, data labeling practice, productivity workflows, and client-ready samples.",
    logoConcept: "A simple pilot wing mark inside a modern profile badge.",
    logoPrompt: "Personal brand badge for Future Skills Pilot, pilot wing mark, modern learner identity, cyan purple slate.",
    colorPalette: ["#06B6D4", "#7C3AED", "#0F172A", "#ECFEFF"],
    fontStyle: "Manrope for modern career-focused presentation.",
    socialMediaBio: "Learning AI skills for freelance-ready digital work.",
    profileHeadline: "Future AI Freelancer | Skills Portfolio in Progress",
    skillsSummary: "AI content support, data labeling basics, productivity tools, client communication."
  },
  {
    brandName: "SkillSpark AI",
    tagline: "Small lessons, visible progress, stronger portfolio.",
    shortBio: "I use SkillPilot AI to learn step by step, track progress, and build confidence with applied AI tasks.",
    portfolioSummary: "Portfolio includes course completions, quiz scores, AI chatbot questions, workflow notes, and project summaries.",
    logoConcept: "A spark icon embedded in a clean learner initials badge.",
    logoPrompt: "Learner personal brand logo, spark icon, initials badge, blue violet white, optimistic and clean.",
    colorPalette: ["#3B82F6", "#D946EF", "#111827", "#FFFFFF"],
    fontStyle: "Plus Jakarta Sans for polished student portfolio design.",
    socialMediaBio: "Building AI confidence through small projects and visible progress.",
    profileHeadline: "AI Skills Learner | Project-Based Portfolio",
    skillsSummary: "AI literacy, course progress, quiz practice, project notes, portfolio growth."
  },
  {
    brandName: "GigReady AI",
    tagline: "Practicing the AI skills needed for real gig work.",
    shortBio: "I am preparing for AI-enabled gig work by learning data tasks, prompt workflows, and communication habits.",
    portfolioSummary: "Portfolio direction includes data labeling samples, prompt templates, mock client briefs, and workflow checklists.",
    logoConcept: "A compact work badge with a checkmark and AI node.",
    logoPrompt: "Personal brand logo for GigReady AI, work badge, checkmark, AI node, blue emerald slate palette.",
    colorPalette: ["#0EA5E9", "#22C55E", "#1F2937", "#F0FDF4"],
    fontStyle: "Source Sans 3 for practical, work-ready readability.",
    socialMediaBio: "Learning AI gig skills through practical courses and portfolio practice.",
    profileHeadline: "AI Gig Skills Learner | Data and Prompt Practice",
    skillsSummary: "Data tasks, prompt workflows, quality checking, learner discipline, gig readiness."
  },
  {
    brandName: "Creator Learner Lab",
    tagline: "Learning AI content skills with a beginner mindset.",
    shortBio: "I am exploring AI-assisted content creation, branding, and marketing basics through guided courses.",
    portfolioSummary: "Portfolio includes AI caption drafts, brand kit experiments, course reflections, and beginner campaign ideas.",
    logoConcept: "A creative lab flask merged with a simple AI sparkle.",
    logoPrompt: "Friendly learner logo for Creator Learner Lab, lab flask, AI sparkle, purple blue clean white background.",
    colorPalette: ["#8B5CF6", "#2563EB", "#312E81", "#F5F3FF"],
    fontStyle: "Montserrat for creative headers with Inter for readable descriptions.",
    socialMediaBio: "Learning AI content creation, branding, and campaign basics.",
    profileHeadline: "AI Content Learner | Brand Portfolio Starter",
    skillsSummary: "AI content creation, branding basics, campaign ideas, social media copy, reflective learning."
  }
];

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    const body = requestSchema.parse(await request.json().catch(() => ({})));
    const role = body.role ?? (user.role === "TRAINER" ? "TRAINER" : "LEARNER");
    const kits = role === "TRAINER" ? trainerKits : learnerKits;
    const kit = kits[Math.floor(Math.random() * kits.length)];

    if (!kit) {
      throw new ValidationError("No mock branding kits are available.");
    }

    return NextResponse.json({ role, branding: kit });
  } catch (error) {
    return handleRouteError(error);
  }
}
