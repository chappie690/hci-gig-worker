export type StockCourse = {
  id: string;
  title: string;
  category: string;
  level: string;
  trainerName: string;
  duration: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  discountedPrice: number;
  discountLabel: string;
  discountActive: boolean;
  rating: string;
  description: string;
  thumbnail: string;
  topic: string;
};

const topics = [
  ["AI Marketing Sprint", "AI Marketing", "Beginner", "Maya Chen", "3 weeks", 79, "AI marketing funnels"],
  ["Prompt Engineering for Gig Work", "Prompt Engineering", "Beginner", "Omar Reed", "2 weeks", 59, "prompt engineering"],
  ["Chatbot Builder Studio", "Chatbot Building", "Intermediate", "Nia Patel", "4 weeks", 129, "customer support chatbots"],
  ["Data Labeling Quality Pro", "Data Labeling", "Beginner", "Lena Brooks", "2 weeks", 49, "data labeling quality"],
  ["No-Code Automation for Freelancers", "Automation", "Intermediate", "Jon Bell", "3 weeks", 99, "no-code workflow automation"],
  ["AI Content Creator Lab", "Content Creation", "Beginner", "Sofia Grant", "3 weeks", 69, "AI content creation"],
  ["Freelance AI Service Packaging", "Freelancing", "Intermediate", "Amir Stone", "2 weeks", 89, "AI service packaging"],
  ["Analytics Basics for Trainers", "Analytics", "Beginner", "Priya Shah", "3 weeks", 75, "learner analytics"],
  ["Personal Brand with AI", "Branding", "Beginner", "Elena Fox", "2 weeks", 65, "AI personal branding"],
  ["Cybersecurity Basics for AI Workers", "Cybersecurity", "Beginner", "Marcus Cole", "3 weeks", 85, "cybersecurity basics"]
] as const;

export const stockCourses: StockCourse[] = Array.from({ length: 50 }, (_, index) => {
  const base = topics[index % topics.length];
  const cohort = Math.floor(index / topics.length) + 1;
  const title = cohort === 1 ? base[0] : `${base[0]} ${cohort}`;
  const price = base[5] + cohort * 6 + (index % 4) * 5;
  const discountActive = index % 4 === 0 || index % 7 === 0;
  const discountPercent = discountActive ? [15, 20, 25][index % 3] : 0;
  const discountedPrice = Math.max(0, Math.round(price - price * discountPercent / 100));

  return {
    id: `stock-course-${String(index + 1).padStart(2, "0")}`,
    title,
    category: base[1],
    level: base[2],
    trainerName: base[3],
    duration: base[4],
    price,
    originalPrice: price,
    discountPercent,
    discountedPrice,
    discountLabel: discountActive ? (index % 2 === 0 ? `${discountPercent}% OFF` : "Student Deal") : "No active discount",
    discountActive,
    rating: (4.6 + (index % 5) * 0.07).toFixed(1),
    topic: base[6],
    thumbnail: `linear-gradient(135deg, ${["#2563eb", "#7c3aed", "#0891b2", "#059669", "#db2777"][index % 5]}, #f8fafc)`,
    description: `${title} helps AI trainers and gig workers practice ${base[6]} through guided examples, repeatable templates, mock client scenarios, and a portfolio-ready final task.`
  };
});

export function getStockCourse(id: string) {
  return stockCourses.find((course) => course.id === id) ?? null;
}
