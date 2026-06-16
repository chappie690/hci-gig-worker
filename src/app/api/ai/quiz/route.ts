import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { generateJSON, isGroqConfigured } from "@/lib/groq";

const requestSchema = z.object({
  courseId: z.string(),
  title: z.string(),
  topic: z.string()
});

const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      answerIndex: z.number().int().min(0).max(3)
    })
  ).length(10)
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Sign in to start this course." }, { status: 401 });
  }

  const body = requestSchema.parse(await request.json());
  const fallback = localQuiz(body.courseId, body.title, body.topic);

  if (isGroqConfigured()) {
    const groq = await generateJSON({
      system: "Generate a 10 question multiple-choice quiz for a SkillPilot course. Each question must be unique, specific to the given course id, title, and topic, and different from generic AI learning quizzes. Include practical scenarios tied to the topic. Return exactly 10 questions with exactly 4 answer options each.",
      user: body,
      schema: quizSchema,
      temperature: 0.6
    });

    if (groq.ok) {
      const unique = ensureUniqueQuestions(groq.value.questions, fallback);
      return NextResponse.json({ questions: unique });
    }
  }

  return NextResponse.json({ questions: fallback });
}

type QuizQuestion = z.infer<typeof quizSchema>["questions"][number];

function ensureUniqueQuestions(groqQuestions: QuizQuestion[], fallback: QuizQuestion[]) {
  const seen = new Set<string>();
  const unique = groqQuestions.filter((question) => {
    const key = normalizeQuestion(question.question);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  if (unique.length === 10) {
    return unique;
  }

  for (const question of fallback) {
    const key = normalizeQuestion(question.question);
    if (!seen.has(key)) {
      unique.push(question);
      seen.add(key);
    }

    if (unique.length === 10) {
      break;
    }
  }

  return unique.slice(0, 10);
}

function localQuiz(courseId: string, title: string, topic: string): QuizQuestion[] {
  const seed = hash(`${courseId}:${title}:${topic}`);
  const concepts = buildConcepts(title, topic);
  const scenarios = rotateList([
    "a first client discovery call",
    "a course portfolio project",
    "a learner support workflow",
    "a paid gig handoff",
    "a quality review checklist",
    "a launch-week content plan",
    "a troubleshooting session",
    "a progress tracking dashboard",
    "a repeatable template library",
    "a final client presentation"
  ], seed);
  const stems = [
    (concept: string, scenario: string) => `In ${title}, which step best applies ${concept} during ${scenario}?`,
    (concept: string, scenario: string) => `For a ${topic} task, what should a learner verify before using ${concept} in ${scenario}?`,
    (concept: string, scenario: string) => `Which decision shows strong ${topic} practice when ${scenario} depends on ${concept}?`,
    (concept: string, scenario: string) => `A learner is building with ${concept}. What is the most reliable next action for ${scenario}?`,
    (concept: string, scenario: string) => `What makes ${concept} useful in ${title} when preparing ${scenario}?`,
    (concept: string, scenario: string) => `Which response would improve trust and quality for ${topic} work in ${scenario}?`,
    (concept: string, scenario: string) => `When ${concept} produces a weak result, what should the learner do before ${scenario}?`,
    (concept: string, scenario: string) => `Which metric best confirms that ${concept} is helping with ${scenario}?`,
    (concept: string, scenario: string) => `How should a freelancer explain ${concept} to a client during ${scenario}?`,
    (concept: string, scenario: string) => `What is the safest way to adapt ${concept} from ${title} for ${scenario}?`
  ];

  return stems.map((buildQuestion, index) => {
    const concept = concepts[(index + seed) % concepts.length];
    const scenario = scenarios[index % scenarios.length];
    const correct = [
      `Define the goal, test one ${concept} step, and review the output against the ${topic} objective`,
      `Check context, constraints, examples, and success criteria before applying ${concept}`,
      `Use a small experiment, compare results, and document what improved the ${topic} workflow`,
      `Ask clarifying questions, protect sensitive data, and tailor ${concept} to the learner or client need`,
      `Connect ${concept} to a measurable outcome, then refine the template from real feedback`
    ][index % 5];
    const distractors = [
      `Reuse the same ${concept} answer for every course and client without review`,
      "Publish the first AI output immediately because speed matters more than fit",
      "Ignore learner context and measure success only by how polished the wording sounds",
      "Remove human review so the workflow feels fully automated",
      "Skip documentation because the process can be recreated later from memory",
      `Choose the longest response even if it does not solve the ${topic} problem`
    ];
    const options = rotateList([correct, ...rotateList(distractors, seed + index).slice(0, 3)], seed + index);

    return {
      question: buildQuestion(concept, scenario),
      options,
      answerIndex: options.indexOf(correct)
    };
  });
}

function buildConcepts(title: string, topic: string) {
  const raw = `${topic} ${title}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !["course", "with", "for", "from", "into", "basics"].includes(word));
  const topicPhrase = topic.trim() || "AI skill";
  const concepts = [
    topicPhrase,
    `${topicPhrase} workflow`,
    `${topicPhrase} quality check`,
    `${topicPhrase} client outcome`,
    `${topicPhrase} prompt or template`,
    ...raw.map((word) => `${word} strategy`)
  ];

  return Array.from(new Set(concepts)).slice(0, 12);
}

function rotateList<T>(items: T[], shift: number) {
  const offset = ((shift % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function hash(value: string) {
  return Array.from(value).reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7);
}

function normalizeQuestion(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
