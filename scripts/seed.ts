/**
 * Seeds two students with ~3 months of realistic practice.
 *
 *   pnpm db:seed
 *
 * Students are created for the two hardcoded accounts in src/server/users.ts
 * and linked to them, so logging in as either shows the sample data.
 * Re-running replaces the seeded students' attempts and all snapshots.
 */
import { config } from "dotenv";
import { inArray } from "drizzle-orm";
import { CAMBRIDGE_ID } from "../src/lib/books";
import { buildCode } from "../src/lib/code";
import { DEFAULT_MISTAKE_TAGS, type Skill } from "../src/lib/constants";
import { addDays, today } from "../src/lib/dates";
import { resolveBand, roundIelts } from "../src/lib/scoring";
import { createDb } from "../src/server/db/client";
import { attempts, reportSnapshots, students, users, type NewAttempt } from "../src/server/db/schema";
import { USERS, emailFor } from "../src/server/users";

config({ path: [".env.local", ".env"], quiet: true });

// Small deterministic PRNG so every seed run looks the same.
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261001);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const chance = (p: number) => rand() < p;
const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

type Profile = {
  name: string;
  userId: string;
  email: string;
  color: string;
  targetBand: number;
  /** Starting accuracy and gain over the whole period for L/R. */
  listening: [number, number];
  reading: [number, number];
  writing: [number, number];
  speaking: [number, number];
  practiceRate: number;
  weakTags: string[];
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const [userA, userB] = USERS;
  const profiles: Profile[] = [
    {
      userId: userA.id,
      name: userA.name,
      email: emailFor(userA),
      color: "#2a78d6",
      targetBand: 7,
      listening: [0.66, 0.14],
      reading: [0.6, 0.12],
      writing: [5.5, 1],
      speaking: [6, 0.5],
      practiceRate: 0.78,
      weakTags: ["map labelling", "T/F/NG", "time management", "spelling"],
    },
    {
      userId: userB.id,
      name: userB.name,
      email: emailFor(userB),
      color: "#eb6834",
      targetBand: 7.5,
      listening: [0.72, 0.1],
      reading: [0.7, 0.12],
      writing: [6, 0.5],
      speaking: [6.5, 0.5],
      practiceRate: 0.65,
      weakTags: ["matching headings", "Y/N/NG", "summary completion", "coherence"],
    },
  ];

  const db = createDb(url);
  const end = today();
  const start = addDays(end, -91);
  const span = 91;

  for (const p of profiles) {
    await db
      .insert(users)
      .values({ id: p.userId, name: p.name, email: p.email, emailVerified: true })
      .onConflictDoNothing();
    const [student] = await db
      .insert(students)
      .values({ userId: p.userId, name: p.name, email: p.email, color: p.color, targetBand: p.targetBand })
      .onConflictDoUpdate({
        target: students.email,
        set: { userId: p.userId, name: p.name, color: p.color, targetBand: p.targetBand },
      })
      .returning();

    await db.delete(attempts).where(inArray(attempts.studentId, [student.id]));

    const rows: NewAttempt[] = [];
    for (let i = 0; i <= span; i++) {
      const date = addDays(start, i);
      if (!chance(p.practiceRate)) continue;
      const progress = i / span;
      const sessions = chance(0.35) ? 2 : 1;
      for (let s = 0; s < sessions; s++) {
        const skill: Skill = pick([
          "reading",
          "reading",
          "listening",
          "listening",
          "writing",
          "speaking",
          ...(chance(0.15) ? (["other"] as const) : []),
        ]);
        const book = 13 + Math.floor(rand() * 7); // Cambridge 13–19
        const test = 1 + Math.floor(rand() * 4);
        const tags = chance(0.7)
          ? [...new Set([pick(p.weakTags), ...(chance(0.4) ? [pick(DEFAULT_MISTAKE_TAGS)] : [])])]
          : [];
        const base = { studentId: student.id, date, skill, mistakeTags: tags, notes: "" };

        if (skill === "listening" || skill === "reading") {
          const [startAcc, gain] = p[skill];
          const full = chance(0.55);
          const parts = skill === "listening" ? ["1", "2", "3", "4"] : ["1", "2", "3"];
          const part = full ? null : pick(parts);
          const total = full ? 40 : skill === "listening" ? 10 : pick([13, 13, 14]);
          // Later sections are harder.
          const partPenalty = part ? (Number(part) - 1) * 0.05 : 0;
          const acc = clamp(startAcc + gain * progress - partPenalty + gauss() * 0.06, 0.2, 1);
          const rawScore = Math.round(acc * total);
          rows.push({
            ...base,
            book,
            test,
            part,
            seriesId: CAMBRIDGE_ID,
            code: buildCode("c", book, test, part),
            rawScore,
            total,
            band: resolveBand({ skill, rawScore, total }),
            timeTakenMin: full ? (skill === "listening" ? 32 : 55 + Math.round(gauss() * 6)) : 18,
          });
        } else if (skill === "writing" || skill === "speaking") {
          const [startBand, gain] = p[skill];
          const band = clamp(roundIelts(startBand + gain * progress + gauss() * 0.4), 4, 9);
          const part = chance(0.5) ? pick(skill === "writing" ? ["1", "2"] : ["1", "2", "3"]) : null;
          rows.push({
            ...base,
            book,
            test,
            part,
            seriesId: CAMBRIDGE_ID,
            code: buildCode("c", book, test, part),
            band: resolveBand({ skill, band }),
            timeTakenMin: skill === "writing" ? (part === "1" ? 20 : part === "2" ? 40 : 60) : 14,
            notes: chance(0.3)
              ? pick(["Ran out of time on task 2", "Better linking words", "Need more examples", "Felt confident"])
              : "",
          });
        } else {
          rows.push({
            ...base,
            mistakeTags: [],
            code: "",
            timeTakenMin: 30,
            notes: pick(["Vocabulary list: environment", "Grammar drills", "Collocations practice"]),
          });
        }
      }
    }
    await db.insert(attempts).values(rows);
    console.log(`Seeded ${rows.length} attempts for ${p.name} <${p.email}>`);
  }

  await db.delete(reportSnapshots);
  console.log("Cleared report snapshots — press Sync & refresh on the dashboard.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
