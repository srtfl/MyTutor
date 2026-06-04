import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ ERROR: GEMINI_API_KEY is missing in .env");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenerativeAI(apiKey);

// Mapped exactly to your screenshots (Main Topic: Subtopic)
const curriculumArray = [
  // 1. NUMBER
  { subject: "Maths", year: "GCSE", topic: "Number: Numerical Operations" },
  { subject: "Maths", year: "GCSE", topic: "Number: Roots & Powers" },
  { subject: "Maths", year: "GCSE", topic: "Number: Surds" },
  { subject: "Maths", year: "GCSE", topic: "Number: Standard Form" },
  { subject: "Maths", year: "GCSE", topic: "Number: Fractions, Decimals & Percentages" },
  { subject: "Maths", year: "GCSE", topic: "Number: Rounding & Estimation" },
  { subject: "Maths", year: "GCSE", topic: "Number: Bounds & Accuracy" },

  // 2. ALGEBRA
  { subject: "Maths", year: "GCSE", topic: "Algebra: Brackets & Expanding" },
  { subject: "Maths", year: "GCSE", topic: "Algebra: Algebraic Fractions" },
  { subject: "Maths", year: "GCSE", topic: "Algebra: Rearranging Formulas" },
  { subject: "Maths", year: "GCSE", topic: "Algebra: Solving Linear Equations" },
  { subject: "Maths", year: "GCSE", topic: "Algebra: Simultaneous Equations" },
  { subject: "Maths", year: "GCSE", topic: "Algebra: Iteration" },
  { subject: "Maths", year: "GCSE", topic: "Algebra: Sequences" },

  // 3. RATIO
  { subject: "Maths", year: "GCSE", topic: "Ratio: Unit Conversions" },
  { subject: "Maths", year: "GCSE", topic: "Ratio: Compound Units" },
  { subject: "Maths", year: "GCSE", topic: "Ratio: Proportion" },
  { subject: "Maths", year: "GCSE", topic: "Ratio: Percentages & Growth" },

  // 4. GEOMETRY
  { subject: "Maths", year: "GCSE", topic: "Geometry: Area & Perimeter" },
  { subject: "Maths", year: "GCSE", topic: "Geometry: Angles" },
  { subject: "Maths", year: "GCSE", topic: "Geometry: Similarity & Congruence" },
  { subject: "Maths", year: "GCSE", topic: "Geometry: Volume & 3D Shapes" },
  { subject: "Maths", year: "GCSE", topic: "Geometry: Vectors" },
  { subject: "Maths", year: "GCSE", topic: "Geometry: Transformations" },
  { subject: "Maths", year: "GCSE", topic: "Geometry: Circle Theorems" },

  // 5. PROBABILITY
  { subject: "Maths", year: "GCSE", topic: "Probability: Introduction to Probability" },
  { subject: "Maths", year: "GCSE", topic: "Probability: Probability Calculations" },

  // 6. STATISTICS
  { subject: "Maths", year: "GCSE", topic: "Statistics: Charts & Diagrams" },
  { subject: "Maths", year: "GCSE", topic: "Statistics: Comparing Datasets" }
];

// Target batch configurations
const targetTiers = [
  { level: "Beginner", count: 20, desc: "Foundational concepts, direct application" },
  { level: "Intermediate", count: 20, desc: "Multi-step problems, standard exam style" },
  { level: "Advanced", count: 20, desc: "Complex problem solving, contextual reasoning" },
  { level: "Further Maths", count: 30, desc: "Highly challenging, top-tier analytical depth" }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCurriculumGenerator() {
  console.log(`🚀 Starting Heavy-Duty Generator: ${curriculumArray.length} topics...`);

  const model = ai.getGenerativeModel({ 
    model: "gemini-2.5-flash-lite",
    generationConfig: { responseMimeType: "application/json" }
  });

  for (let i = 0; i < curriculumArray.length; i++) {
    const item = curriculumArray[i];
    console.log(`\n=================================================`);
    console.log(`📦 Processing Topic [${i + 1}/${curriculumArray.length}]: ${item.topic}`);

    for (const tier of targetTiers) {
      console.log(`   ⏳ Fetching ${tier.count} ${tier.level} questions...`);

   const prompt = `
        You are an elite UK curriculum designer specialized in Edexcel GCSE Mathematics specifications.
        Generate exactly ${tier.count} distinctly unique math questions for the topic: "${item.topic}".
        
        Difficulty Level constraint: "${tier.level}" (${tier.desc}).
        Make sure these questions do not repeat and cover various angles of the subtopic.

        CRITICAL JSON RULE: If you use LaTeX math formatting (like \\sqrt or \\frac), you MUST double-escape the backslashes (e.g., \\\\sqrt, \\\\frac) so the raw text parses as valid JSON!

        The output must be a valid, raw JSON array containing exactly ${tier.count} objects matching this strict schema:
        [
          {
            "subject": "${item.subject}",
            "year_level": "${item.year}",
            "topic": "${item.topic}",
            "difficulty": "${tier.level}",
            "question_text": "Clear text description of the question",
            "formula": "Relevant mathematical formula or hint syntax if applicable, otherwise empty string",
            "solution": "Step-by-step detailed resolution breakdown ending with the final bolded answer"
          }
        ]
      `;

 try {
        const result = await model.generateContent(prompt);
        let rawText = result.response.text();

      // 🆕 THE ULTIMATE FIX: Safely escapes all LaTeX (\frac, \theta, \underline) without breaking JSON
        rawText = rawText.replace(/(?<!\\)\\(?![\\"])/g, "\\\\");
        // Strip out any markdown code blocks if the AI accidentally included them
        rawText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '');

        const parsedQuestions = JSON.parse(rawText);

        const { error } = await supabase.from('questions').insert(parsedQuestions);

        if (error) {
          console.error(`   ❌ DB Error (${tier.level}):`, error.message);
        } else {
          console.log(`   ✅ Saved ${parsedQuestions.length} ${tier.level} questions.`);
        }
      } catch (err) {
        console.error(`   ❌ AI/Parse Error (${tier.level}):`, err.message || err);
      }

      // Crucial: Wait 6 seconds between tier fetches to prevent API rate limiting
      await delay(20000);
    }
  }
  console.log("\n🏁 Data seeding sequence complete!");
}

runCurriculumGenerator();