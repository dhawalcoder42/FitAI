import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import {
  Home, Utensils, Dumbbell, TrendingUp, ClipboardList, Droplets, Camera, Plus, Minus, Trash2,
  Check, Flame, Timer, Settings, X, Sparkles, Search, Pencil, ChevronRight, ChevronLeft, ChevronDown,
  Play, Scale, Footprints, RefreshCw, Moon, CalendarDays,
} from "lucide-react";

/* ============================= THEME ============================= */
const C = {
  bg: "#0C0E14", card: "#151A23", card2: "#1B2130", line: "#242B3A",
  text: "#F2F0EA", mut: "#8B93A7", ember: "#FF8A4C", aqua: "#45C4F5",
  mint: "#5EEAB4", gold: "#F5C044", rose: "#F87180",
};

const StyleTag = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html, body { background: ${C.bg}; }
    .fd { font-family: 'Sora', ui-sans-serif, system-ui, sans-serif; }
    .fb { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    ::-webkit-scrollbar { display: none; }
    input, textarea, select { outline: none; }
    input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .rise { animation: rise .35s ease both; }
    @keyframes slideUp { from { transform: translateY(40px); opacity: .4; } to { transform: translateY(0); opacity: 1; } }
    .sheetIn { animation: slideUp .28s cubic-bezier(.2,.8,.3,1) both; }
    @keyframes scanPulse { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
    .scanning { animation: scanPulse 1.1s ease infinite; }
    @media (prefers-reduced-motion: reduce) { .rise, .sheetIn, .scanning { animation: none; } }
  `}</style>
);

/* ============================= STORAGE ============================= */
const mem = {};
const store = {
  async get(k) {
    try {
      if (!window.storage) return mem[k] ?? null;
      const r = await window.storage.get(k);
      return r ? JSON.parse(r.value) : null;
    } catch (e) { return mem[k] ?? null; }
  },
  async set(k, v) {
    mem[k] = v;
    try { if (window.storage) await window.storage.set(k, JSON.stringify(v)); } catch (e) { /* best-effort */ }
  },
  async del(k) {
    delete mem[k];
    try { if (window.storage) await window.storage.delete(k); } catch (e) { /* best-effort */ }
  },
};

/* ============================= HELPERS ============================= */
const pad = (n) => String(n).padStart(2, "0");
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayIdx = (d = new Date()) => (d.getDay() + 6) % 7; // 0 = Monday
const niceDate = (d = new Date()) =>
  d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
const rnd = (n) => Math.round(n || 0);

const ACT = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };
const ACT_LABELS = [
  ["sedentary", "Sedentary", "Desk job, little movement"],
  ["light", "Lightly active", "Walks, 1–2 workouts/week"],
  ["moderate", "Moderately active", "Workout 3–5 days/week"],
  ["active", "Very active", "Hard training 6 days/week"],
  ["athlete", "Athlete", "Physical job + daily training"],
];
const GOALS = [
  ["lose", "Lose fat", "~0.5 kg/week deficit"],
  ["gain", "Build muscle", "Lean surplus + strength"],
  ["recomp", "Recomp", "Lose fat, keep muscle"],
  ["maintain", "Maintain", "Stay at current weight"],
];
const GOAL_TXT = { lose: "fat loss", gain: "muscle building", recomp: "body recomposition", maintain: "maintenance" };
const DIETS = [["veg", "Veg"], ["egg", "Veg + Egg"], ["nonveg", "Non-veg"]];

const bmrOf = (p, w) => rnd(10 * w + 6.25 * p.h - 5 * p.age + (p.gender === "male" ? 5 : -161));
function calcTargets(p, w) {
  const bmr = bmrOf(p, w);
  const tdee = rnd(bmr * (ACT[p.activity] || 1.375));
  let cal = tdee;
  if (p.goal === "lose") cal = tdee - 500;
  else if (p.goal === "gain") cal = tdee + 300;
  else if (p.goal === "recomp") cal = tdee - 250;
  cal = Math.max(1200, cal);
  const protein = rnd(w * (p.goal === "gain" ? 2.0 : p.goal === "lose" ? 1.9 : 1.8));
  const fat = rnd((cal * 0.25) / 9);
  const carbs = Math.max(0, rnd((cal - protein * 4 - fat * 9) / 4));
  const glasses = p.waterGlasses || Math.min(16, Math.max(8, rnd((w * 35) / 250)));
  return { bmr, tdee, cal, protein, carbs, fat, glasses, stepsGoal: p.stepsGoal || 8000 };
}
const bmiOf = (kg, hCm) => kg / Math.pow(hCm / 100, 2);
const bmiCat = (b) =>
  b < 18.5 ? ["Underweight", C.aqua] : b < 25 ? ["Healthy", C.mint] : b < 30 ? ["Overweight", C.gold] : ["Obese", C.rose];
const stepBurn = (steps, kg) => rnd(steps * kg * 0.0004);

const emptyDay = () => ({ water: 0, steps: 0, foods: { b: [], l: [], s: [], d: [] }, done: false, checks: {}, habits: {} });
const MEALS = [["b", "Breakfast"], ["l", "Lunch"], ["s", "Snacks"], ["d", "Dinner"]];

const dayTotals = (day) => {
  const t = { c: 0, p: 0, cb: 0, f: 0, n: 0 };
  if (!day) return t;
  MEALS.forEach(([k]) => (day.foods?.[k] || []).forEach((it) => {
    t.c += it.c || 0; t.p += it.p || 0; t.cb += it.cb || 0; t.f += it.f || 0; t.n += 1;
  }));
  return t;
};

const isActiveDay = (day) =>
  !!day && (
    day.water > 0 || day.done || (day.steps || 0) > 0 ||
    MEALS.some(([k]) => (day.foods?.[k] || []).length > 0) ||
    Object.values(day.checks || {}).some(Boolean)
  );

function calcStreak(days, restDay) {
  let s = 0, guard = 0;
  const d = new Date();
  const wd = (dt) => (dt.getDay() + 6) % 7;
  const act = (k) => isActiveDay(days[k]);
  if (!act(dkey(d)) && wd(d) !== restDay) d.setDate(d.getDate() - 1);
  while (guard++ < 3700) {
    const k = dkey(d);
    if (act(k)) { s++; d.setDate(d.getDate() - 1); }
    else if (wd(d) === restDay) { d.setDate(d.getDate() - 1); } // rest day: streak-safe, skip
    else break;
  }
  return s;
}

function workoutForDay(profile, wdIdx) {
  const plan = PLANS[profile.plan] || PLANS.trainer;
  const rest = profile.restDay ?? 6;
  const restT = plan.days.find((x) => x.rest) || plan.days[plan.days.length - 1];
  if (wdIdx === rest) return restT;
  const work = plan.days.filter((x) => !x.rest);
  const pos = wdIdx < rest ? wdIdx : wdIdx - 1;
  return work[pos % work.length];
}

function weekKeys(offset) {
  const now = new Date();
  const wd = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - wd - offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return dkey(d);
  });
}

function weekStats(data, keys, glasses) {
  let workouts = 0, calSum = 0, pSum = 0, calDays = 0, waterDays = 0, stepsSum = 0;
  keys.forEach((k) => {
    const d = data.days[k];
    if (!d) return;
    if (d.done) workouts++;
    const t = dayTotals(d);
    if (t.c > 0) { calSum += t.c; pSum += t.p; calDays++; }
    if (d.water >= glasses) waterDays++;
    stepsSum += d.steps || 0;
  });
  return {
    workouts,
    avgCal: calDays ? rnd(calSum / calDays) : 0,
    avgP: calDays ? rnd(pSum / calDays) : 0,
    waterDays,
    avgSteps: rnd(stepsSum / 7),
  };
}

/* ============================= CLAUDE API ============================= */
async function askClaude(content) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content }] }),
  });
  const d = await res.json();
  const txt = (d.content || []).filter((x) => x.type === "text").map((x) => x.text).join("\n");
  const s = txt.replace(/```json|```/gi, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("No JSON in response");
  return JSON.parse(s.slice(a, b + 1));
}

const compressImage = (file) => new Promise((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    try {
      const max = 1024;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.width * s));
      cv.height = Math.max(1, Math.round(img.height * s));
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/jpeg", 0.82).split(",")[1]);
    } catch (e) { reject(e); }
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
  img.src = url;
});

const SCAN_PROMPT = `Analyze the food in this photo (likely Indian food). Identify each distinct item and estimate the visible portion weight in grams plus its nutrition. Respond with ONLY minified JSON, no markdown, exactly: {"items":[{"n":"food name","g":grams,"c":kcal,"p":protein_g,"cb":carbs_g,"f":fat_g}],"note":"one short coaching tip"}`;

/* ============================= FOOD DATABASE (per 100 g) ============================= */
const FOODS = [
  { n: "Roti (whole wheat)", u: "1 roti", ug: 40, c: 280, p: 9, cb: 46, f: 7 },
  { n: "Bhakri (jowar)", u: "1 bhakri", ug: 60, c: 250, p: 7, cb: 50, f: 2.5 },
  { n: "Paratha (plain)", u: "1 paratha", ug: 80, c: 320, p: 6, cb: 45, f: 13 },
  { n: "Methi-palak paratha", u: "1 paratha", ug: 80, c: 290, p: 7, cb: 42, f: 10 },
  { n: "White rice (cooked)", u: "1 bowl", ug: 150, c: 130, p: 2.7, cb: 28, f: 0.3 },
  { n: "Brown rice (cooked)", u: "1 bowl", ug: 150, c: 111, p: 2.6, cb: 23, f: 0.9 },
  { n: "Dal / varan (cooked)", u: "1 bowl", ug: 150, c: 115, p: 7, cb: 16, f: 2.5 },
  { n: "Usal (sprouted curry)", u: "1 bowl", ug: 150, c: 120, p: 8, cb: 16, f: 3 },
  { n: "Rajma (cooked)", u: "1 bowl", ug: 150, c: 140, p: 8.7, cb: 22, f: 0.6 },
  { n: "Chole (cooked)", u: "1 bowl", ug: 150, c: 160, p: 8, cb: 25, f: 3 },
  { n: "Khichdi", u: "1 bowl", ug: 200, c: 120, p: 5, cb: 19, f: 2.5 },
  { n: "Masala oats (cooked)", u: "1 bowl", ug: 200, c: 110, p: 4, cb: 18, f: 2.5 },
  { n: "Paneer", u: "50 g", ug: 50, c: 265, p: 18, cb: 3.5, f: 20 },
  { n: "Tofu", u: "100 g", ug: 100, c: 76, p: 8, cb: 2, f: 4.5 },
  { n: "Soya chunks (dry)", u: "30 g", ug: 30, c: 345, p: 52, cb: 33, f: 0.5 },
  { n: "Chicken breast (cooked)", u: "100 g", ug: 100, c: 165, p: 31, cb: 0, f: 3.6 },
  { n: "Chicken curry", u: "1 bowl", ug: 150, c: 170, p: 13, cb: 6, f: 10 },
  { n: "Fish (grilled)", u: "100 g", ug: 100, c: 150, p: 22, cb: 0, f: 6 },
  { n: "Egg (whole)", u: "1 egg", ug: 50, c: 143, p: 12.5, cb: 1, f: 9.5 },
  { n: "Egg white", u: "1 white", ug: 33, c: 52, p: 11, cb: 0.7, f: 0.2 },
  { n: "Milk (toned)", u: "1 glass", ug: 250, c: 58, p: 3.1, cb: 4.8, f: 3 },
  { n: "Curd (dahi)", u: "1 bowl", ug: 150, c: 62, p: 3.5, cb: 4.7, f: 3.3 },
  { n: "Greek yogurt", u: "1 cup", ug: 150, c: 97, p: 9, cb: 4, f: 5 },
  { n: "Buttermilk (chaas)", u: "1 glass", ug: 200, c: 20, p: 1, cb: 2, f: 0.6 },
  { n: "Whey protein", u: "1 scoop", ug: 30, c: 380, p: 76, cb: 8, f: 6 },
  { n: "Oats (raw)", u: "40 g", ug: 40, c: 389, p: 13.5, cb: 66, f: 7 },
  { n: "Poha (cooked)", u: "1 plate", ug: 200, c: 158, p: 3, cb: 31, f: 3 },
  { n: "Upma", u: "1 plate", ug: 200, c: 155, p: 4, cb: 26, f: 4 },
  { n: "Idli", u: "1 idli", ug: 40, c: 132, p: 5, cb: 28, f: 0.4 },
  { n: "Dosa (plain)", u: "1 dosa", ug: 85, c: 200, p: 5, cb: 32, f: 6 },
  { n: "Sambar", u: "1 bowl", ug: 150, c: 65, p: 3.5, cb: 9, f: 1.5 },
  { n: "Chicken biryani", u: "1 plate", ug: 300, c: 165, p: 9, cb: 20, f: 6 },
  { n: "Veg pulao", u: "1 plate", ug: 200, c: 145, p: 3.5, cb: 24, f: 4 },
  { n: "Maggi (cooked)", u: "1 pack", ug: 300, c: 150, p: 3.5, cb: 20, f: 6.5 },
  { n: "Bread (white)", u: "1 slice", ug: 25, c: 265, p: 9, cb: 49, f: 3.2 },
  { n: "Brown bread", u: "1 slice", ug: 28, c: 250, p: 12, cb: 43, f: 3.5 },
  { n: "Peanut butter", u: "1 tbsp", ug: 16, c: 588, p: 25, cb: 20, f: 50 },
  { n: "Banana", u: "1 medium", ug: 120, c: 89, p: 1.1, cb: 23, f: 0.3 },
  { n: "Apple", u: "1 medium", ug: 180, c: 52, p: 0.3, cb: 14, f: 0.2 },
  { n: "Orange", u: "1 medium", ug: 130, c: 47, p: 0.9, cb: 12, f: 0.1 },
  { n: "Mango", u: "1 cup", ug: 165, c: 60, p: 0.8, cb: 15, f: 0.4 },
  { n: "Walnuts", u: "2 halves", ug: 8, c: 654, p: 15, cb: 14, f: 65 },
  { n: "Cucumber", u: "1 whole", ug: 100, c: 15, p: 0.7, cb: 3.6, f: 0.1 },
  { n: "Salad (mixed veg)", u: "1 bowl", ug: 100, c: 25, p: 1.3, cb: 5, f: 0.2 },
  { n: "Sprouts (moong)", u: "1 bowl", ug: 100, c: 30, p: 3, cb: 6, f: 0.2 },
  { n: "Roasted chana", u: "1 handful", ug: 30, c: 370, p: 19, cb: 60, f: 6 },
  { n: "Almonds", u: "10 pieces", ug: 12, c: 579, p: 21, cb: 22, f: 50 },
  { n: "Peanuts (roasted)", u: "1 handful", ug: 30, c: 567, p: 26, cb: 16, f: 49 },
  { n: "Potato (boiled)", u: "1 medium", ug: 130, c: 87, p: 1.9, cb: 20, f: 0.1 },
  { n: "Sweet potato", u: "1 medium", ug: 130, c: 86, p: 1.6, cb: 20, f: 0.1 },
  { n: "Ghee", u: "1 tsp", ug: 5, c: 900, p: 0, cb: 0, f: 100 },
  { n: "Cooking oil", u: "1 tsp", ug: 5, c: 884, p: 0, cb: 0, f: 100 },
  { n: "Sugar", u: "1 tsp", ug: 4, c: 387, p: 0, cb: 100, f: 0 },
  { n: "Tea (milk + sugar)", u: "1 cup", ug: 150, c: 45, p: 1.5, cb: 6, f: 1.5 },
  { n: "Coffee (with milk)", u: "1 cup", ug: 150, c: 45, p: 1.7, cb: 5, f: 1.8 },
  { n: "Green tea", u: "1 cup", ug: 200, c: 1, p: 0, cb: 0, f: 0 },
  { n: "Dark chocolate", u: "2 squares", ug: 20, c: 546, p: 5, cb: 61, f: 31 },
  { n: "Protein bar", u: "1 bar", ug: 60, c: 380, p: 33, cb: 40, f: 12 },
];

/* ============================= WORKOUT PLANS ============================= */
const PLANS = {
  trainer: {
    name: "Trainer Split", tag: "Gym · 6-day muscle split", days: [
      { t: "Chest & Triceps", m: ["chest", "triceps"], ex: [
        { n: "Bench Press", s: "3 × 10–12" }, { n: "Incline Press", s: "3 × 10–12" },
        { n: "Machine / Cable Flyes", s: "3 × 10–12" }, { n: "Triceps Rope Pushdown", s: "3 × 10–12" },
        { n: "Overhead Triceps Extension", s: "3 × 10–12" }, { n: "Skull Crushers", s: "3 × 10–12" } ] },
      { t: "Back & Biceps", m: ["lats", "traps", "biceps", "forearms"], ex: [
        { n: "Barbell Row", s: "3 × 10–12" }, { n: "Seated Cable Row (Wide Grip)", s: "3 × 10–12" },
        { n: "Lat Pulldown (Wide Grip)", s: "3 × 10–12" }, { n: "Preacher Curl", s: "3 × 10–12" },
        { n: "Hammer Curl", s: "3 × 10–12" }, { n: "Barbell Curl", s: "3 × 10–12" } ] },
      { t: "Full Legs + Core", m: ["quads", "hamstrings", "glutes", "calves", "abs"], ex: [
        { n: "Hack Squat", s: "3 × 10–12" }, { n: "Leg Press", s: "3 × 10–12" },
        { n: "Leg Extension", s: "3 × 10–12" }, { n: "Lying Leg Curl", s: "3 × 10–12" },
        { n: "Seated Leg Curl", s: "3 × 10–12" }, { n: "Adductor Machine", s: "3 × 10–12" },
        { n: "Plank", s: "3 × 45s" } ] },
      { t: "Shoulders & Arms", m: ["shoulders", "traps", "biceps", "triceps"], ex: [
        { n: "Military Press", s: "3 × 10–12" }, { n: "Lateral Raise", s: "3 × 10–12" },
        { n: "Front Raise", s: "3 × 10–12" }, { n: "Reverse Pec Fly", s: "3 × 10–12" },
        { n: "Barbell Curl", s: "3 × 10" }, { n: "Triceps Pushdown", s: "3 × 10" } ] },
      { t: "Chest & Back", m: ["chest", "lats", "shoulders"], ex: [
        { n: "Bench Press", s: "3 × 10" }, { n: "Incline Dumbbell Press", s: "3 × 10" },
        { n: "Lat Pulldown", s: "3 × 10" }, { n: "Seated Cable Row", s: "3 × 10" },
        { n: "Cable Fly", s: "3 × 12" }, { n: "Face Pull", s: "3 × 15" } ] },
      { t: "Cardio + Core (Belly Fat)", m: ["abs", "obliques"], ex: [
        { n: "Incline Treadmill Walk", s: "20–25 min" }, { n: "Crunches", s: "3 × 12" },
        { n: "Leg Raises", s: "3 × 12" }, { n: "Reverse Crunch", s: "3 × 12" },
        { n: "Heel Touches", s: "3 × 12" }, { n: "Bicycle Crunch", s: "3 × 12" },
        { n: "Plank", s: "3 × 45s" } ] },
      { t: "Rest & Recovery", rest: true, m: [], ex: [
        { n: "Easy walk", s: "8–10k steps" }, { n: "Full-body stretching", s: "10–15 min" } ] },
    ],
  },
  muscle: {
    name: "Muscle Building", tag: "Gym · Push Pull Legs", days: [
      { t: "Push — Chest · Shoulders · Triceps", m: ["chest", "shoulders", "triceps"], ex: [
        { n: "Barbell Bench Press", s: "4 × 6–8" }, { n: "Overhead Press", s: "3 × 8–10" },
        { n: "Incline Dumbbell Press", s: "3 × 10–12" }, { n: "Lateral Raise", s: "3 × 12–15" },
        { n: "Triceps Rope Pushdown", s: "3 × 10–12" }, { n: "Overhead Triceps Extension", s: "3 × 12" } ] },
      { t: "Pull — Back · Biceps", m: ["lats", "traps", "biceps", "forearms"], ex: [
        { n: "Deadlift", s: "3 × 5" }, { n: "Lat Pulldown or Pull-ups", s: "3 × 8–10" },
        { n: "Barbell Row", s: "3 × 8–10" }, { n: "Face Pull", s: "3 × 15" },
        { n: "Barbell Curl", s: "3 × 10" }, { n: "Hammer Curl", s: "3 × 12" } ] },
      { t: "Legs — Quads · Hams · Calves", m: ["quads", "hamstrings", "glutes", "calves", "abs"], ex: [
        { n: "Back Squat", s: "4 × 6–8" }, { n: "Romanian Deadlift", s: "3 × 8–10" },
        { n: "Leg Press", s: "3 × 10–12" }, { n: "Leg Curl", s: "3 × 12" },
        { n: "Standing Calf Raise", s: "4 × 15" }, { n: "Plank", s: "3 × 45s" } ] },
      { t: "Push — Volume Day", m: ["chest", "shoulders", "triceps"], ex: [
        { n: "Incline Barbell Press", s: "4 × 8" }, { n: "Seated Dumbbell Press", s: "3 × 10" },
        { n: "Cable Fly", s: "3 × 12–15" }, { n: "Lateral Raise", s: "3 × 15" },
        { n: "Dips", s: "3 × max" }, { n: "Skullcrusher", s: "3 × 10" } ] },
      { t: "Pull — Volume Day", m: ["lats", "traps", "biceps", "forearms"], ex: [
        { n: "Pull-ups", s: "4 × max" }, { n: "Seated Cable Row", s: "3 × 10" },
        { n: "Single-arm Dumbbell Row", s: "3 × 10" }, { n: "Rear Delt Fly", s: "3 × 15" },
        { n: "Preacher Curl", s: "3 × 10" }, { n: "Shrugs", s: "3 × 12" } ] },
      { t: "Legs + Core", m: ["quads", "glutes", "calves", "abs"], ex: [
        { n: "Front or Goblet Squat", s: "3 × 8" }, { n: "Walking Lunge", s: "3 × 12/leg" },
        { n: "Hip Thrust", s: "3 × 10" }, { n: "Leg Extension", s: "3 × 12" },
        { n: "Seated Calf Raise", s: "4 × 15" }, { n: "Hanging Knee Raise", s: "3 × 12" } ] },
      { t: "Rest & Recovery", rest: true, m: [], ex: [
        { n: "Easy walk", s: "8–10k steps" }, { n: "Full-body stretching", s: "10–15 min" } ] },
    ],
  },
  fatloss: {
    name: "Fat Loss", tag: "Gym · Strength + Cardio", days: [
      { t: "Full Body Strength A", m: ["quads", "chest", "lats", "hamstrings", "abs"], ex: [
        { n: "Goblet Squat", s: "3 × 10" }, { n: "Dumbbell Bench Press", s: "3 × 10" },
        { n: "Lat Pulldown", s: "3 × 10" }, { n: "Dumbbell RDL", s: "3 × 10" },
        { n: "Plank", s: "3 × 40s" } ] },
      { t: "Cardio + Core", m: ["abs", "obliques"], ex: [
        { n: "Incline Treadmill Walk", s: "30 min" }, { n: "Cycling", s: "10 min" },
        { n: "Crunches", s: "3 × 15" }, { n: "Russian Twist", s: "3 × 20" },
        { n: "Leg Raise", s: "3 × 12" } ] },
      { t: "Full Body Strength B", m: ["quads", "shoulders", "lats", "glutes"], ex: [
        { n: "Leg Press", s: "3 × 12" }, { n: "Overhead Press", s: "3 × 10" },
        { n: "Seated Cable Row", s: "3 × 10" }, { n: "Walking Lunge", s: "3 × 10/leg" },
        { n: "Farmer Carry", s: "3 × 40m" } ] },
      { t: "HIIT Day", m: ["quads", "calves", "abs"], ex: [
        { n: "Sprint / fast walk intervals", s: "10 × 30s on · 90s off" },
        { n: "Mountain Climbers", s: "3 × 30s" }, { n: "Burpees", s: "3 × 10" },
        { n: "Cool-down walk", s: "5 min" } ] },
      { t: "Full Body Strength C", m: ["hamstrings", "chest", "lats", "quads"], ex: [
        { n: "Deadlift", s: "3 × 6" }, { n: "Push-ups", s: "3 × max" },
        { n: "Lat Pulldown", s: "3 × 10" }, { n: "Step-ups", s: "3 × 10/leg" },
        { n: "Side Plank", s: "3 × 30s/side" } ] },
      { t: "Active Cardio", m: ["quads", "calves"], ex: [
        { n: "Brisk walk / swim / sport", s: "45–60 min" }, { n: "Light stretching", s: "10 min" } ] },
      { t: "Rest & Recovery", rest: true, m: [], ex: [
        { n: "Easy walk", s: "8k steps" }, { n: "Stretch + foam roll", s: "10–15 min" } ] },
    ],
  },
  home: {
    name: "Home Workout", tag: "No equipment", days: [
      { t: "Push — Bodyweight", m: ["chest", "shoulders", "triceps"], ex: [
        { n: "Push-ups", s: "4 × max" }, { n: "Pike Push-ups", s: "3 × 8" },
        { n: "Chair Dips", s: "3 × 12" }, { n: "Diamond Push-ups", s: "2 × 10" },
        { n: "Plank Shoulder Taps", s: "3 × 20" } ] },
      { t: "Legs — Bodyweight", m: ["quads", "glutes", "calves"], ex: [
        { n: "Squats", s: "4 × 15" }, { n: "Reverse Lunges", s: "3 × 12/leg" },
        { n: "Glute Bridge", s: "3 × 15" }, { n: "Wall Sit", s: "3 × 45s" },
        { n: "Calf Raises", s: "4 × 20" } ] },
      { t: "Cardio + Core", m: ["abs", "obliques"], ex: [
        { n: "Jumping Jacks", s: "3 × 40" }, { n: "High Knees", s: "3 × 30s" },
        { n: "Mountain Climbers", s: "3 × 30s" }, { n: "Crunches", s: "3 × 15" },
        { n: "Plank", s: "3 × 45s" } ] },
      { t: "Back + Posture", m: ["lats", "lowerback", "traps"], ex: [
        { n: "Superman Hold", s: "3 × 12" }, { n: "Towel Row (door)", s: "3 × 12" },
        { n: "Reverse Snow Angels", s: "3 × 12" }, { n: "Bird-Dog", s: "3 × 10/side" } ] },
      { t: "Full Body Burn", m: ["quads", "chest", "abs"], ex: [
        { n: "Burpees", s: "3 × 10" }, { n: "Squat Jumps", s: "3 × 12" },
        { n: "Push-ups", s: "3 × 12" }, { n: "Lunge Pulses", s: "3 × 10/leg" },
        { n: "Plank", s: "3 × 60s" } ] },
      { t: "Steps + Mobility", m: ["calves", "quads"], ex: [
        { n: "Long walk", s: "8–10k steps" }, { n: "Yoga / stretching", s: "15 min" } ] },
      { t: "Rest & Recovery", rest: true, m: [], ex: [
        { n: "Easy walk", s: "30 min" }, { n: "Deep stretching", s: "10 min" } ] },
    ],
  },
};

/* ============================= BELLY-FAT CORE CIRCUIT ============================= */
const CORE = [
  { n: "Crunches", s: "3 × 12", g: "Upper abs" },
  { n: "Leg Raises", s: "3 × 12", g: "Lower abs" },
  { n: "Reverse Crunch", s: "3 × 12", g: "Lower abs" },
  { n: "Heel Touches", s: "3 × 12", g: "Obliques" },
  { n: "Bicycle Crunch", s: "3 × 12", g: "Obliques" },
  { n: "Russian Twist", s: "3 × 20", g: "Obliques" },
  { n: "Mountain Climbers", s: "3 × 30s", g: "Full core" },
  { n: "Plank", s: "3 × 45s", g: "Full core" },
];

/* ============================= TRAINER DIET (translated to English) ============================= */
const TRAINER_DIET = [
  { time: "7:00 AM", tag: "Wake up", items: [
    "1 glass lukewarm water + 1 tsp apple cider vinegar", "2 walnuts"] },
  { time: "8–9 AM", tag: "Training", items: [
    "Gym — 45–60 min workout"] },
  { time: "9:00 AM", tag: "Breakfast", items: [
    "1 cup green tea",
    "1 bowl masala oats — OR — methi & palak paratha + 2 egg whites"] },
  { time: "1:00 PM", tag: "Lunch", items: [
    "1 bowl salad (cucumber, carrot, radish, cabbage)",
    "1 chapati or 2 phulkas (no oil) + sabzi / usal",
    "1 tsp curry-leaf chutney",
    "1 bowl curd or 1 glass buttermilk",
    "1 bowl dal (varan) or amti",
    "10 min after the meal: a pinch of cinnamon in 1 glass lukewarm water"] },
  { time: "5:00 PM", tag: "Evening", items: [
    "Green tea"] },
  { time: "8:00 PM", tag: "Dinner", items: [
    "Salad (carrot, cucumber, cabbage, radish, tomato)",
    "2 bhakri or phulkas + sabzi",
    "1 bowl dal (varan) or amti + 1 tsp curry-leaf chutney",
    "Boneless chicken or fish — only on Mon · Wed · Fri · Sun"] },
  { time: "10:00 PM", tag: "Before bed", items: [
    "1 glass lukewarm water + 1 tsp ajwain + jeera powder"] },
];

const PROTEIN_SHEET = [
  ["4 whole eggs", "~24g"], ["6 egg whites", "~20g"], ["120g chicken breast", "~25g"],
  ["120g fish", "~25g"], ["100g paneer", "~18–20g"], ["250g tofu", "~20–30g"],
  ["50g soya chunks", "~25g"], ["1 scoop whey", "~20–24g"], ["200g Greek yogurt", "~20–25g"],
  ["1 cup cooked dal", "~9–12g"], ["50g peanuts", "~12–13g"], ["250ml toned milk", "~8–9g"],
];

/* ============================= DEFAULT MEAL BANK (offline fallback) ============================= */
function defaultBank(diet) {
  const veg = {
    b: [
      { n: "Oats + milk + 1 banana", c: 350, p: 14 },
      { n: "Besan chilla ×2 + curd", c: 360, p: 20 },
      { n: "Poha + peanuts + chaas", c: 380, p: 12 },
      { n: "Paneer bhurji + 2 roti", c: 450, p: 24 },
      { n: "Idli ×3 + sambar", c: 330, p: 12 },
    ],
    l: [
      { n: "Dal + 2 roti + salad + curd", c: 520, p: 24 },
      { n: "Rajma + rice bowl + salad", c: 560, p: 20 },
      { n: "Paneer sabzi + 2 roti + salad", c: 580, p: 26 },
      { n: "Chole + rice + salad", c: 560, p: 19 },
      { n: "Veg khichdi + curd + salad", c: 500, p: 18 },
    ],
    s: [
      { n: "Roasted chana + chaas", c: 200, p: 12 },
      { n: "Fruit + 10 almonds", c: 180, p: 5 },
      { n: "Sprouts chaat", c: 180, p: 12 },
      { n: "Peanut butter toast", c: 220, p: 9 },
    ],
    d: [
      { n: "Paneer tikka + salad + 1 roti", c: 450, p: 28 },
      { n: "Dal + 1 roti + sabzi", c: 420, p: 20 },
      { n: "Soya chunk curry + rice", c: 480, p: 30 },
      { n: "Moong dal chilla ×2 + curd", c: 400, p: 22 },
      { n: "Veg soup + grilled paneer", c: 380, p: 24 },
    ],
  };
  const bank = JSON.parse(JSON.stringify(veg));
  if (diet === "egg" || diet === "nonveg") {
    bank.b[1] = { n: "3-egg omelette + 2 toast", c: 380, p: 22 };
    bank.d[3] = { n: "Egg curry (2 eggs) + 1 roti", c: 430, p: 22 };
  }
  if (diet === "nonveg") {
    bank.l[2] = { n: "Chicken curry + 2 roti + salad", c: 560, p: 32 };
    bank.d[0] = { n: "Grilled chicken + rice + salad", c: 520, p: 38 };
    bank.d[4] = { n: "Fish curry + rice + salad", c: 480, p: 30 };
  }
  return bank;
}

const DEFAULT_HABITS = ["Sleep 7–8 hours", "No sugary drinks", "Protein in every meal", "10 min stretching"];

/* ============================= SMALL UI PARTS ============================= */
const Card = ({ children, className = "", style = {} }) => (
  <div className={`rounded-3xl p-4 rise ${className}`} style={{ background: C.card, border: `1px solid ${C.line}`, ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, color, children, right }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={16} style={{ color }} />}
      <span className="fd font-semibold text-sm" style={{ color: C.text }}>{children}</span>
    </div>
    {right}
  </div>
);

const Btn = ({ children, onClick, color = C.ember, ghost, full, small, disabled, style = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`fd font-semibold rounded-2xl active:scale-95 transition-transform ${full ? "w-full" : ""} ${small ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"}`}
    style={{
      background: ghost ? "transparent" : color,
      color: ghost ? color : "#0C0E14",
      border: ghost ? `1px solid ${C.line}` : "none",
      opacity: disabled ? 0.4 : 1,
      ...style,
    }}
  >
    {children}
  </button>
);

const Chip = ({ active, onClick, children, color = C.ember }) => (
  <button
    onClick={onClick}
    className="fb text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform"
    style={{
      background: active ? color : C.card2,
      color: active ? "#0C0E14" : C.mut,
      border: `1px solid ${active ? color : C.line}`,
    }}
  >
    {children}
  </button>
);

const Field = ({ label, children }) => (
  <div className="mb-3">
    <div className="fb text-xs mb-1.5" style={{ color: C.mut }}>{label}</div>
    {children}
  </div>
);

const inputStyle = {
  background: C.card2, border: `1px solid ${C.line}`, color: C.text,
  borderRadius: 14, padding: "12px 14px", width: "100%", fontSize: 15,
};

function FuelArc({ consumed, target, over }) {
  const R = 88, CIRC = 2 * Math.PI * R, vis = 0.75 * CIRC;
  const pct = Math.min(1, target ? consumed / target : 0);
  return (
    <div className="relative mx-auto" style={{ width: 230, height: 196 }}>
      <svg width={230} height={230} viewBox="0 0 230 230" style={{ position: "absolute", top: -14, left: 0 }}>
        <circle cx={115} cy={115} r={R} fill="none" stroke={C.card2} strokeWidth={14} strokeLinecap="round"
          strokeDasharray={`${vis} ${CIRC}`} transform="rotate(135 115 115)" />
        <circle cx={115} cy={115} r={R} fill="none" stroke={over ? C.rose : C.ember} strokeWidth={14} strokeLinecap="round"
          strokeDasharray={`${Math.max(0.001, vis * pct)} ${CIRC}`} transform="rotate(135 115 115)"
          style={{ transition: "stroke-dasharray .6s ease, stroke .3s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="fd font-extrabold" style={{ fontSize: 46, color: C.text, lineHeight: 1 }}>
          {Math.max(0, rnd(target - consumed))}
        </div>
        <div className="fb text-xs mt-1" style={{ color: C.mut }}>kcal left</div>
        <div className="fb text-xs mt-1.5" style={{ color: over ? C.rose : C.mut }}>
          {rnd(consumed)} / {target} eaten
        </div>
      </div>
    </div>
  );
}

const Rail = ({ label, val, max, color }) => (
  <div className="flex-1">
    <div className="flex justify-between fb text-xs mb-1">
      <span style={{ color: C.mut }}>{label}</span>
      <span className="font-semibold" style={{ color: C.text }}>
        {rnd(val)}<span style={{ color: C.mut }}>/{max}g</span>
      </span>
    </div>
    <div className="h-1.5 rounded-full" style={{ background: C.card2 }}>
      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (val / max) * 100)}%`, background: color, transition: "width .4s" }} />
    </div>
  </div>
);

const Sheet = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,.62)" }} onClick={onClose}>
    <div className="sheetIn rounded-t-3xl px-4 pt-4 pb-8 overflow-y-auto" onClick={(e) => e.stopPropagation()}
      style={{ background: "#12151D", borderTop: `1px solid ${C.line}`, maxHeight: "88vh" }}>
      <div className="mx-auto mb-3 rounded-full" style={{ width: 40, height: 4, background: C.line }} />
      <div className="flex items-center justify-between mb-4">
        <span className="fd font-bold text-base" style={{ color: C.text }}>{title}</span>
        <button onClick={onClose} className="p-2 rounded-full active:scale-90" style={{ background: C.card2 }}>
          <X size={16} style={{ color: C.mut }} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* ============================= MUSCLE MAP (original figures) ============================= */
const BODY_BASE = [
  { t: "c", cx: 60, cy: 15, r: 10 },
  { t: "r", x: 54, y: 24, w: 12, h: 8, rx: 3 },
  { t: "p", d: "M37 31 L83 31 L78 97 L42 97 Z" },
  { t: "r", x: 43, y: 97, w: 34, h: 14, rx: 5 },
  { t: "r", x: 23, y: 34, w: 13, h: 37, rx: 6 },
  { t: "r", x: 84, y: 34, w: 13, h: 37, rx: 6 },
  { t: "r", x: 21, y: 71, w: 11, h: 32, rx: 5 },
  { t: "r", x: 88, y: 71, w: 11, h: 32, rx: 5 },
  { t: "r", x: 44, y: 111, w: 15, h: 58, rx: 7 },
  { t: "r", x: 61, y: 111, w: 15, h: 58, rx: 7 },
  { t: "r", x: 45, y: 169, w: 13, h: 46, rx: 6 },
  { t: "r", x: 62, y: 169, w: 13, h: 46, rx: 6 },
];

const FRONT_M = {
  traps: [{ t: "e", cx: 60, cy: 31, rx: 13, ry: 4.5 }],
  shoulders: [{ t: "c", cx: 32, cy: 38, r: 7 }, { t: "c", cx: 88, cy: 38, r: 7 }],
  chest: [{ t: "e", cx: 49.5, cy: 46, rx: 10, ry: 8 }, { t: "e", cx: 70.5, cy: 46, rx: 10, ry: 8 }],
  biceps: [{ t: "e", cx: 29.5, cy: 55, rx: 6, ry: 11 }, { t: "e", cx: 90.5, cy: 55, rx: 6, ry: 11 }],
  forearms: [{ t: "e", cx: 26.5, cy: 86, rx: 5, ry: 13 }, { t: "e", cx: 93.5, cy: 86, rx: 5, ry: 13 }],
  abs: [
    { t: "r", x: 50.5, y: 57, w: 8.5, h: 10, rx: 2 }, { t: "r", x: 61, y: 57, w: 8.5, h: 10, rx: 2 },
    { t: "r", x: 50.5, y: 68.5, w: 8.5, h: 10, rx: 2 }, { t: "r", x: 61, y: 68.5, w: 8.5, h: 10, rx: 2 },
    { t: "r", x: 50.5, y: 80, w: 8.5, h: 10, rx: 2 }, { t: "r", x: 61, y: 80, w: 8.5, h: 10, rx: 2 },
  ],
  obliques: [{ t: "e", cx: 44.5, cy: 72, rx: 4.5, ry: 14 }, { t: "e", cx: 75.5, cy: 72, rx: 4.5, ry: 14 }],
  quads: [{ t: "e", cx: 51.5, cy: 137, rx: 7, ry: 24 }, { t: "e", cx: 68.5, cy: 137, rx: 7, ry: 24 }],
  calves: [{ t: "e", cx: 51.5, cy: 188, rx: 5.5, ry: 16 }, { t: "e", cx: 68.5, cy: 188, rx: 5.5, ry: 16 }],
};

const BACK_M = {
  traps: [{ t: "p", d: "M46 31 L74 31 L60 54 Z" }],
  shoulders: [{ t: "c", cx: 32, cy: 38, r: 7 }, { t: "c", cx: 88, cy: 38, r: 7 }],
  triceps: [{ t: "e", cx: 29.5, cy: 55, rx: 6, ry: 11 }, { t: "e", cx: 90.5, cy: 55, rx: 6, ry: 11 }],
  forearms: [{ t: "e", cx: 26.5, cy: 86, rx: 5, ry: 13 }, { t: "e", cx: 93.5, cy: 86, rx: 5, ry: 13 }],
  lats: [{ t: "e", cx: 48, cy: 66, rx: 9, ry: 15 }, { t: "e", cx: 72, cy: 66, rx: 9, ry: 15 }],
  lowerback: [{ t: "r", x: 52, y: 82, w: 16, h: 14, rx: 4 }],
  glutes: [{ t: "c", cx: 52, cy: 104, r: 8 }, { t: "c", cx: 68, cy: 104, r: 8 }],
  hamstrings: [{ t: "e", cx: 51.5, cy: 137, rx: 7, ry: 24 }, { t: "e", cx: 68.5, cy: 137, rx: 7, ry: 24 }],
  calves: [{ t: "e", cx: 51.5, cy: 186, rx: 5.5, ry: 17 }, { t: "e", cx: 68.5, cy: 186, rx: 5.5, ry: 17 }],
};

const MUSCLE_NAMES = {
  chest: "Chest", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
  abs: "Abs", obliques: "Obliques", lats: "Lats", traps: "Traps", lowerback: "Lower Back",
  glutes: "Glutes", quads: "Quads", hamstrings: "Hamstrings", calves: "Calves",
};

const Shape = ({ s, fill, stroke }) => {
  if (s.t === "c") return <circle cx={s.cx} cy={s.cy} r={s.r} fill={fill} stroke={stroke} strokeWidth={1} />;
  if (s.t === "e") return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={fill} stroke={stroke} strokeWidth={1} />;
  if (s.t === "r") return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={fill} stroke={stroke} strokeWidth={1} />;
  return <path d={s.d} fill={fill} stroke={stroke} strokeWidth={1} />;
};

function Figure({ side, muscles }) {
  const M = side === "front" ? FRONT_M : BACK_M;
  return (
    <svg width={82} height={202} viewBox="14 0 92 228">
      {BODY_BASE.map((s, i) => <Shape key={"b" + i} s={s} fill="#191E29" stroke="#242B3A" />)}
      {Object.entries(M).map(([k, shapes]) => shapes.map((s, i) => (
        <Shape key={k + i} s={s}
          fill={muscles.includes(k) ? C.ember : "#232B3A"}
          stroke={muscles.includes(k) ? "#FFC08F" : "#2C3547"} />
      )))}
    </svg>
  );
}

function MuscleMap({ muscles = [] }) {
  if (!muscles.length) return null;
  return (
    <div className="mb-3">
      <div className="flex justify-center gap-8">
        {["front", "back"].map((side) => (
          <div key={side} className="text-center">
            <Figure side={side} muscles={muscles} />
            <div className="fb mt-1" style={{ fontSize: 10, color: C.mut }}>{side === "front" ? "Front" : "Back"}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 mt-2">
        {muscles.map((m) => MUSCLE_NAMES[m] ? (
          <span key={m} className="fb font-semibold px-2 py-0.5 rounded-full"
            style={{ fontSize: 10, background: "rgba(255,138,76,.12)", color: C.ember, border: "1px solid rgba(255,138,76,.3)" }}>
            {MUSCLE_NAMES[m]}
          </span>
        ) : null)}
      </div>
    </div>
  );
}

/* ============================= ONBOARDING ============================= */
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    name: "", gender: "male", age: "", h: "", w: "", goalW: "",
    activity: "moderate", goal: "lose", diet: "veg",
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const num = (v) => parseFloat(v) || 0;

  const valid0 = f.name.trim() && num(f.age) >= 10 && num(f.age) <= 100;
  const valid1 = num(f.h) >= 100 && num(f.h) <= 230 && num(f.w) >= 30 && num(f.w) <= 250 && num(f.goalW) >= 30;

  const preview = valid1 ? calcTargets({ ...f, age: num(f.age), h: num(f.h) }, num(f.w)) : null;

  const finish = () => {
    onDone({
      name: f.name.trim(), gender: f.gender, age: num(f.age), h: num(f.h), w: num(f.w),
      goalW: num(f.goalW), activity: f.activity, goal: f.goal, diet: f.diet,
      remindMin: 60, stepsGoal: 8000, plan: "trainer", restDay: 6,
      habits: [...DEFAULT_HABITS],
    });
  };

  return (
    <div className="min-h-screen fb px-5 pt-12 pb-10 max-w-md mx-auto" style={{ background: C.bg }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="rounded-2xl flex items-center justify-center" style={{ width: 40, height: 40, background: `linear-gradient(135deg, ${C.ember}, #FFB37E)` }}>
          <Flame size={20} color="#0C0E14" />
        </div>
        <div>
          <div className="fd font-extrabold text-xl" style={{ color: C.text }}>FitAI</div>
          <div className="text-xs" style={{ color: C.mut }}>Your personal health coach</div>
        </div>
      </div>
      <div className="flex gap-1.5 my-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? C.ember : C.card2, transition: "background .3s" }} />
        ))}
      </div>

      {step === 0 && (
        <div className="rise">
          <div className="fd font-bold text-2xl mb-1" style={{ color: C.text }}>Let's set you up</div>
          <div className="text-sm mb-6" style={{ color: C.mut }}>Takes 30 seconds. Everything is calculated for you.</div>
          <Field label="Your name"><input style={inputStyle} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Sanskar" /></Field>
          <Field label="Gender">
            <div className="flex gap-2">
              {[["male", "Male"], ["female", "Female"]].map(([k, l]) => (
                <Chip key={k} active={f.gender === k} onClick={() => set("gender", k)}>{l}</Chip>
              ))}
            </div>
          </Field>
          <Field label="Age"><input style={inputStyle} type="number" inputMode="numeric" value={f.age} onChange={(e) => set("age", e.target.value)} placeholder="25" /></Field>
          <div className="mt-6"><Btn full disabled={!valid0} onClick={() => setStep(1)}>Continue</Btn></div>
        </div>
      )}

      {step === 1 && (
        <div className="rise">
          <div className="fd font-bold text-2xl mb-1" style={{ color: C.text }}>Body stats</div>
          <div className="text-sm mb-6" style={{ color: C.mut }}>Used for BMR, BMI and your calorie targets.</div>
          <Field label="Height (cm)"><input style={inputStyle} type="number" inputMode="decimal" value={f.h} onChange={(e) => set("h", e.target.value)} placeholder="172" /></Field>
          <Field label="Current weight (kg)"><input style={inputStyle} type="number" inputMode="decimal" value={f.w} onChange={(e) => set("w", e.target.value)} placeholder="78" /></Field>
          <Field label="Goal weight (kg)"><input style={inputStyle} type="number" inputMode="decimal" value={f.goalW} onChange={(e) => set("goalW", e.target.value)} placeholder="70" /></Field>
          <div className="flex gap-2 mt-6">
            <Btn ghost color={C.mut} onClick={() => setStep(0)}>Back</Btn>
            <div className="flex-1"><Btn full disabled={!valid1} onClick={() => setStep(2)}>Continue</Btn></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rise">
          <div className="fd font-bold text-2xl mb-1" style={{ color: C.text }}>Goal & lifestyle</div>
          <div className="text-sm mb-6" style={{ color: C.mut }}>This sets your daily calorie and protein plan.</div>
          <Field label="Main goal">
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(([k, l, d]) => (
                <button key={k} onClick={() => set("goal", k)} className="text-left rounded-2xl p-3 active:scale-95 transition-transform"
                  style={{ background: f.goal === k ? "rgba(255,138,76,.12)" : C.card2, border: `1px solid ${f.goal === k ? C.ember : C.line}` }}>
                  <div className="fd font-semibold text-sm" style={{ color: f.goal === k ? C.ember : C.text }}>{l}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.mut }}>{d}</div>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Activity level">
            <div className="flex flex-col gap-2">
              {ACT_LABELS.map(([k, l, d]) => (
                <button key={k} onClick={() => set("activity", k)} className="flex items-center justify-between rounded-2xl p-3 active:scale-95 transition-transform"
                  style={{ background: f.activity === k ? "rgba(69,196,245,.10)" : C.card2, border: `1px solid ${f.activity === k ? C.aqua : C.line}` }}>
                  <div className="text-left">
                    <div className="fd font-semibold text-sm" style={{ color: f.activity === k ? C.aqua : C.text }}>{l}</div>
                    <div className="text-xs" style={{ color: C.mut }}>{d}</div>
                  </div>
                  {f.activity === k && <Check size={16} style={{ color: C.aqua }} />}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Food preference">
            <div className="flex gap-2">{DIETS.map(([k, l]) => <Chip key={k} active={f.diet === k} onClick={() => set("diet", k)} color={C.mint}>{l}</Chip>)}</div>
          </Field>

          {preview && (
            <div className="rounded-2xl p-4 mt-2 mb-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="fb text-xs mb-2" style={{ color: C.mut }}>Your daily plan</div>
              <div className="grid grid-cols-2 gap-y-2">
                <div><span className="fd font-bold text-lg" style={{ color: C.ember }}>{preview.cal}</span><span className="text-xs ml-1" style={{ color: C.mut }}>kcal</span></div>
                <div><span className="fd font-bold text-lg" style={{ color: C.mint }}>{preview.protein}g</span><span className="text-xs ml-1" style={{ color: C.mut }}>protein</span></div>
                <div><span className="fd font-bold text-lg" style={{ color: C.aqua }}>{preview.glasses}</span><span className="text-xs ml-1" style={{ color: C.mut }}>glasses water</span></div>
                <div><span className="fd font-bold text-lg" style={{ color: C.gold }}>{preview.tdee}</span><span className="text-xs ml-1" style={{ color: C.mut }}>TDEE kcal</span></div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Btn ghost color={C.mut} onClick={() => setStep(1)}>Back</Btn>
            <div className="flex-1"><Btn full onClick={finish}>Start tracking <ChevronRight size={14} style={{ display: "inline", marginLeft: 2 }} /></Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================= ADD FOOD SHEET ============================= */
function AddFoodSheet({ meal, onClose, onAdd, toast }) {
  const [mode, setMode] = useState("menu");
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(null);
  const [grams, setGrams] = useState(0);
  const [imgPreview, setImgPreview] = useState(null);
  const [imgB64, setImgB64] = useState(null);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [note, setNote] = useState("");
  const fileRef = useRef(null);

  const mealLabel = (MEALS.find(([k]) => k === meal) || [])[1] || "Meal";

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FOODS.slice(0, 10);
    return FOODS.filter((x) => x.n.toLowerCase().includes(q)).slice(0, 10);
  }, [query]);

  const pickFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const b64 = await compressImage(file);
      setImgB64(b64);
      setImgPreview(`data:image/jpeg;base64,${b64}`);
    } catch (err) { toast("Couldn't read that photo — try another one"); }
  };

  const runScan = async () => {
    if (!imgB64) return;
    setLoading(true);
    try {
      const r = await askClaude([
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imgB64 } },
        { type: "text", text: SCAN_PROMPT },
      ]);
      const its = (r.items || []).map((x) => ({ ...x, base: { ...x } }));
      if (!its.length) throw new Error("empty");
      setItems(its); setNote(r.note || ""); setMode("review");
    } catch (e) { toast("Scan failed — check internet and try again"); }
    setLoading(false);
  };

  const runDescribe = async () => {
    if (!desc.trim()) return;
    setLoading(true);
    try {
      const r = await askClaude([{
        type: "text",
        text: `Estimate nutrition for this eaten food (Indian context): "${desc.trim()}". Respond with ONLY minified JSON, no markdown: {"items":[{"n":"food name","g":grams,"c":kcal,"p":protein_g,"cb":carbs_g,"f":fat_g}],"note":"one short coaching tip"}`,
      }]);
      const its = (r.items || []).map((x) => ({ ...x, base: { ...x } }));
      if (!its.length) throw new Error("empty");
      setItems(its); setNote(r.note || ""); setMode("review");
    } catch (e) { toast("Couldn't estimate — check internet and try again"); }
    setLoading(false);
  };

  const setItemGrams = (i, g) => {
    setItems((arr) => arr.map((it, idx) => {
      if (idx !== i) return it;
      const gg = Math.max(5, g);
      const r = gg / (it.base.g || 1);
      return { ...it, g: gg, c: it.base.c * r, p: it.base.p * r, cb: it.base.cb * r, f: it.base.f * r };
    }));
  };

  const addReview = () => {
    onAdd(items.map(({ n, g, c, p, cb, f }) => ({ n, g: rnd(g), c: rnd(c), p: +p.toFixed(1), cb: +cb.toFixed(1), f: +f.toFixed(1) })));
    onClose();
  };

  const addSearchItem = () => {
    if (!sel || !grams) return;
    const r = grams / 100;
    onAdd([{ n: sel.n, g: rnd(grams), c: rnd(sel.c * r), p: +(sel.p * r).toFixed(1), cb: +(sel.cb * r).toFixed(1), f: +(sel.f * r).toFixed(1) }]);
    toast(`Added ${sel.n}`);
    setSel(null); setGrams(0); setQuery("");
  };

  return (
    <Sheet title={`Add to ${mealLabel}`} onClose={onClose}>
      {mode === "menu" && (
        <div className="flex flex-col gap-2.5">
          {[
            ["scan", Camera, C.ember, "Scan with camera", "Click a photo — AI finds foods, grams & calories"],
            ["search", Search, C.aqua, "Search food", "55+ Indian & common foods with macros"],
            ["describe", Pencil, C.mint, "Describe it", "Type \u201C2 roti, dal, salad\u201D — AI estimates everything"],
          ].map(([k, Icon, col, t, d]) => (
            <button key={k} onClick={() => setMode(k)} className="flex items-center gap-3 rounded-2xl p-4 text-left active:scale-95 transition-transform"
              style={{ background: C.card2, border: `1px solid ${C.line}` }}>
              <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,.04)" }}><Icon size={20} style={{ color: col }} /></div>
              <div className="flex-1">
                <div className="fd font-semibold text-sm" style={{ color: C.text }}>{t}</div>
                <div className="text-xs mt-0.5" style={{ color: C.mut }}>{d}</div>
              </div>
              <ChevronRight size={16} style={{ color: C.mut }} />
            </button>
          ))}
        </div>
      )}

      {mode === "scan" && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={pickFile} style={{ display: "none" }} />
          {!imgPreview ? (
            <button onClick={() => fileRef.current && fileRef.current.click()} className="w-full rounded-2xl flex flex-col items-center justify-center py-12 active:scale-95 transition-transform"
              style={{ background: C.card2, border: `1.5px dashed ${C.line}` }}>
              <Camera size={30} style={{ color: C.ember }} />
              <div className="fd font-semibold text-sm mt-3" style={{ color: C.text }}>Take or choose a photo</div>
              <div className="text-xs mt-1" style={{ color: C.mut }}>Plate, tiffin, snack — anything</div>
            </button>
          ) : (
            <div>
              <img src={imgPreview} alt="food" className={`w-full rounded-2xl object-cover ${loading ? "scanning" : ""}`} style={{ maxHeight: 260 }} />
              <div className="flex gap-2 mt-3">
                <Btn ghost color={C.mut} onClick={() => { setImgPreview(null); setImgB64(null); }}>Retake</Btn>
                <div className="flex-1">
                  <Btn full onClick={runScan} disabled={loading}>
                    {loading ? "Analyzing photo…" : <><Sparkles size={14} style={{ display: "inline", marginRight: 6 }} />Analyze with AI</>}
                  </Btn>
                </div>
              </div>
            </div>
          )}
          <div className="text-xs mt-3 text-center" style={{ color: C.mut }}>AI estimates portions — you can adjust grams after.</div>
        </div>
      )}

      {mode === "search" && (
        <div>
          <input style={inputStyle} placeholder="Search roti, paneer, oats…" value={query} onChange={(e) => { setQuery(e.target.value); setSel(null); }} />
          <div className="flex flex-col gap-1.5 mt-3">
            {results.map((fd) => (
              <div key={fd.n}>
                <button onClick={() => { setSel(sel && sel.n === fd.n ? null : fd); setGrams(fd.ug); }}
                  className="w-full flex items-center justify-between rounded-2xl p-3 active:scale-95 transition-transform"
                  style={{ background: sel && sel.n === fd.n ? "rgba(69,196,245,.10)" : C.card2, border: `1px solid ${sel && sel.n === fd.n ? C.aqua : C.line}` }}>
                  <div className="text-left">
                    <div className="fb font-semibold text-sm" style={{ color: C.text }}>{fd.n}</div>
                    <div className="text-xs" style={{ color: C.mut }}>{fd.u} ≈ {rnd(fd.c * fd.ug / 100)} kcal · {(fd.p * fd.ug / 100).toFixed(1)}g protein</div>
                  </div>
                  <Plus size={16} style={{ color: C.aqua }} />
                </button>
                {sel && sel.n === fd.n && (
                  <div className="rounded-2xl p-3 mt-1.5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setGrams(Math.max(5, grams - 10))} className="p-2 rounded-xl active:scale-90" style={{ background: C.card2 }}><Minus size={14} style={{ color: C.mut }} /></button>
                      <input style={{ ...inputStyle, textAlign: "center", padding: "8px" }} type="number" inputMode="numeric" value={rnd(grams)} onChange={(e) => setGrams(parseFloat(e.target.value) || 0)} />
                      <span className="text-xs" style={{ color: C.mut }}>g</span>
                      <button onClick={() => setGrams(grams + 10)} className="p-2 rounded-xl active:scale-90" style={{ background: C.card2 }}><Plus size={14} style={{ color: C.mut }} /></button>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {[0.5, 1, 2, 3].map((m) => (
                        <Chip key={m} color={C.aqua} active={Math.abs(grams - fd.ug * m) < 1} onClick={() => setGrams(fd.ug * m)}>{m === 0.5 ? "½" : m}× {fd.u.replace(/^1 /, "")}</Chip>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="fb text-xs" style={{ color: C.mut }}>
                        = <span className="fd font-bold" style={{ color: C.ember }}>{rnd(fd.c * grams / 100)} kcal</span> · {(fd.p * grams / 100).toFixed(1)}g P
                      </div>
                      <Btn small onClick={addSearchItem}>Add</Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!results.length && <div className="text-sm text-center py-6" style={{ color: C.mut }}>Nothing found — try "Describe it" instead.</div>}
          </div>
        </div>
      )}

      {mode === "describe" && (
        <div>
          <textarea style={{ ...inputStyle, minHeight: 100, resize: "none" }} placeholder={'e.g. "2 roti, 1 bowl dal, cucumber salad, 1 glass milk"'} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="mt-3">
            <Btn full onClick={runDescribe} disabled={loading || !desc.trim()}>
              {loading ? "Estimating…" : <><Sparkles size={14} style={{ display: "inline", marginRight: 6 }} />Estimate with AI</>}
            </Btn>
          </div>
        </div>
      )}

      {mode === "review" && (
        <div>
          <div className="flex flex-col gap-2">
            {items.map((it, i) => (
              <div key={i} className="rounded-2xl p-3" style={{ background: C.card2, border: `1px solid ${C.line}` }}>
                <div className="flex items-center justify-between">
                  <div className="fb font-semibold text-sm" style={{ color: C.text }}>{it.n}</div>
                  <button onClick={() => setItems((arr) => arr.filter((_, x) => x !== i))} className="p-1.5 rounded-lg active:scale-90"><Trash2 size={14} style={{ color: C.rose }} /></button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setItemGrams(i, it.g - 10)} className="p-1.5 rounded-lg active:scale-90" style={{ background: C.card }}><Minus size={13} style={{ color: C.mut }} /></button>
                    <span className="fd font-bold text-sm" style={{ color: C.text, minWidth: 48, textAlign: "center" }}>{rnd(it.g)} g</span>
                    <button onClick={() => setItemGrams(i, it.g + 10)} className="p-1.5 rounded-lg active:scale-90" style={{ background: C.card }}><Plus size={13} style={{ color: C.mut }} /></button>
                  </div>
                  <div className="fb text-xs" style={{ color: C.mut }}>
                    <span className="fd font-bold" style={{ color: C.ember }}>{rnd(it.c)} kcal</span> · P {it.p.toFixed(0)} · C {it.cb.toFixed(0)} · F {it.f.toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {note && <div className="text-xs mt-3 px-1" style={{ color: C.mint }}>💡 {note}</div>}
          <div className="flex items-center justify-between mt-4">
            <div className="fb text-sm" style={{ color: C.mut }}>
              Total: <span className="fd font-bold" style={{ color: C.text }}>{rnd(items.reduce((a, x) => a + x.c, 0))} kcal</span>
            </div>
            <Btn onClick={addReview} disabled={!items.length}>Add {items.length} item{items.length !== 1 ? "s" : ""}</Btn>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ============================= HOME TAB ============================= */
function HomeTab({ profile, t, day, tot, mutDay, goTab, nextRemindMs, curW }) {
  const over = tot.c > t.cal && (profile.goal === "lose" || profile.goal === "recomp");
  const burn = stepBurn(day.steps || 0, curW);
  const planDef = PLANS[profile.plan] || PLANS.trainer;
  const todayW = workoutForDay(profile, dayIdx());
  const mins = nextRemindMs != null ? Math.max(0, Math.ceil(nextRemindMs / 60000)) : null;

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <FuelArc consumed={tot.c} target={t.cal} over={over} />
        <div className="flex gap-3 mt-1">
          <Rail label="Protein" val={tot.p} max={t.protein} color={C.mint} />
          <Rail label="Carbs" val={tot.cb} max={t.carbs} color={C.gold} />
          <Rail label="Fat" val={tot.f} max={t.fat} color={C.rose} />
        </div>
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
          <span className="fb text-xs" style={{ color: C.mut }}>🔥 Activity burn today: ~{burn} kcal</span>
          <button onClick={() => goTab("food")} className="fb text-xs font-semibold active:scale-95" style={{ color: C.ember }}>Log food →</button>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Droplets} color={C.aqua} right={
          <span className="fd font-bold text-sm" style={{ color: C.aqua }}>{day.water}<span style={{ color: C.mut }}>/{t.glasses}</span></span>
        }>Water · 250 ml glasses</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: t.glasses }).map((_, i) => (
            <button key={i} onClick={() => mutDay({ water: i + 1 === day.water ? i : i + 1 })}
              className="rounded-full active:scale-90 transition-transform"
              style={{
                width: 22, height: 36, border: `1px solid ${i < day.water ? C.aqua : C.line}`,
                background: i < day.water ? "linear-gradient(180deg,#7FDBFF,#45C4F5)" : C.card2, transition: "background .2s",
              }} />
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            <Btn small color={C.aqua} onClick={() => mutDay({ water: Math.min(t.glasses + 8, day.water + 1) })}><Plus size={12} style={{ display: "inline" }} /> Glass</Btn>
            <Btn small ghost color={C.mut} onClick={() => mutDay({ water: Math.max(0, day.water - 1) })}>Undo</Btn>
          </div>
          {profile.remindMin > 0 && mins != null && (
            <span className="fb text-xs" style={{ color: C.mut }}>⏰ next reminder in {mins}m</span>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Footprints} color={C.aqua} right={
          <span className="fd font-bold text-sm" style={{ color: C.text }}>{(day.steps || 0).toLocaleString()}<span style={{ color: C.mut }}>/{t.stepsGoal.toLocaleString()}</span></span>
        }>Steps & activity</SectionTitle>
        <div className="h-2 rounded-full mb-3" style={{ background: C.card2 }}>
          <div className="h-2 rounded-full" style={{ width: `${Math.min(100, ((day.steps || 0) / t.stepsGoal) * 100)}%`, background: `linear-gradient(90deg, ${C.aqua}, ${C.mint})`, transition: "width .4s" }} />
        </div>
        <div className="flex gap-2 items-center">
          {[1000, 2000, 5000].map((n) => (
            <Chip key={n} color={C.aqua} onClick={() => mutDay({ steps: (day.steps || 0) + n })}>+{n / 1000}k</Chip>
          ))}
          <input style={{ ...inputStyle, padding: "8px 10px", fontSize: 13, flex: 1 }} type="number" inputMode="numeric" placeholder="Set exact"
            onKeyDown={(e) => { if (e.key === "Enter") { mutDay({ steps: parseInt(e.target.value) || 0 }); e.target.value = ""; e.target.blur(); } }}
            onBlur={(e) => { if (e.target.value) { mutDay({ steps: parseInt(e.target.value) || 0 }); e.target.value = ""; } }} />
        </div>
        <div className="fb text-xs mt-2" style={{ color: C.mut }}>Copy today's count from your phone's step counter — I'll track the trend.</div>
      </Card>

      <Card>
        <SectionTitle icon={todayW.rest ? Moon : Dumbbell} color={C.ember} right={
          day.done ? <span className="fb text-xs font-semibold" style={{ color: C.mint }}>✓ Done</span> : null
        }>Today's workout</SectionTitle>
        <div className="fd font-semibold text-sm" style={{ color: C.text }}>{todayW.t}</div>
        <div className="fb text-xs mt-0.5" style={{ color: C.mut }}>{planDef.name} · {todayW.ex.length} movements{todayW.rest ? " · streak-safe" : ""}</div>
        <div className="mt-3"><Btn full ghost color={C.ember} onClick={() => goTab("train")}>{day.done ? "View workout" : todayW.rest ? "View recovery plan" : "Start workout"} <Play size={12} style={{ display: "inline", marginLeft: 4 }} /></Btn></div>
      </Card>

      {(profile.habits || []).length > 0 && (
        <Card>
          <SectionTitle icon={Check} color={C.mint}>Daily habits</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {profile.habits.map((h) => {
              const on = !!day.habits[h];
              return (
                <button key={h} onClick={() => mutDay({ habits: { ...day.habits, [h]: !on } })}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 active:scale-95 transition-transform"
                  style={{ background: on ? "rgba(94,234,180,.08)" : C.card2, border: `1px solid ${on ? "rgba(94,234,180,.35)" : C.line}` }}>
                  <div className="rounded-md flex items-center justify-center" style={{ width: 18, height: 18, background: on ? C.mint : "transparent", border: `1.5px solid ${on ? C.mint : C.mut}` }}>
                    {on && <Check size={12} color="#0C0E14" />}
                  </div>
                  <span className="fb text-sm" style={{ color: on ? C.text : C.mut, textDecoration: on ? "line-through" : "none" }}>{h}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================= FOOD TAB ============================= */
function FoodTab({ t, day, tot, addFoods, removeFood, toast }) {
  const [addMeal, setAddMeal] = useState(null);
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="fb text-xs" style={{ color: C.mut }}>Today's intake</div>
            <div className="fd font-extrabold text-2xl mt-0.5" style={{ color: C.text }}>{rnd(tot.c)} <span className="text-sm" style={{ color: C.mut }}>/ {t.cal} kcal</span></div>
          </div>
          <div className="text-right fb text-xs" style={{ color: C.mut }}>
            <div>P <span className="font-semibold" style={{ color: C.mint }}>{rnd(tot.p)}g</span></div>
            <div>C <span className="font-semibold" style={{ color: C.gold }}>{rnd(tot.cb)}g</span></div>
            <div>F <span className="font-semibold" style={{ color: C.rose }}>{rnd(tot.f)}g</span></div>
          </div>
        </div>
      </Card>

      {MEALS.map(([k, label]) => {
        const list = day.foods[k] || [];
        const mc = list.reduce((a, x) => a + x.c, 0);
        return (
          <Card key={k}>
            <SectionTitle icon={Utensils} color={C.ember} right={
              <span className="fb text-xs font-semibold" style={{ color: mc ? C.text : C.mut }}>{rnd(mc)} kcal</span>
            }>{label}</SectionTitle>
            {list.length === 0 && <div className="fb text-xs mb-2" style={{ color: C.mut }}>Nothing logged yet.</div>}
            <div className="flex flex-col gap-1.5 mb-2">
              {list.map((it, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: C.card2 }}>
                  <div className="min-w-0">
                    <div className="fb text-sm font-medium truncate" style={{ color: C.text }}>{it.n}</div>
                    <div className="fb text-xs" style={{ color: C.mut }}>{it.g} g · {rnd(it.c)} kcal · P {rnd(it.p)}g</div>
                  </div>
                  <button onClick={() => removeFood(k, i)} className="p-2 active:scale-90"><Trash2 size={14} style={{ color: C.rose }} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setAddMeal(k)} className="w-full rounded-xl py-2.5 fb text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              style={{ border: `1.5px dashed ${C.line}`, color: C.ember }}>
              <Plus size={13} /> Add food <span style={{ color: C.mut }}>· 📷 scan / search / describe</span>
            </button>
          </Card>
        );
      })}

      {addMeal && <AddFoodSheet meal={addMeal} onClose={() => setAddMeal(null)} onAdd={(items) => addFoods(addMeal, items)} toast={toast} />}
    </div>
  );
}

/* ============================= TRAIN TAB ============================= */
function TrainTab({ profile, day, mutDay, setProfileField, toast }) {
  const planDef = PLANS[profile.plan] || PLANS.trainer;
  const idx = dayIdx();
  const restDay = profile.restDay ?? 6;
  const todayW = workoutForDay(profile, idx);
  const doneCount = todayW.ex.filter((e) => day.checks[e.n]).length;
  const [sec, setSec] = useState(0);
  const [total, setTotal] = useState(90);
  const [running, setRunning] = useState(false);
  const [coreOpen, setCoreOpen] = useState(false);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setSec((s) => {
        if (s <= 1) {
          setRunning(false);
          try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
          toast("Rest over — next set! 💪");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [running, toast]);

  const toggle = (key) => mutDay({ checks: { ...day.checks, [key]: !day.checks[key] } });
  const vid = (n) => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(n + " exercise proper form")}`, "_blank");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Object.entries(PLANS).map(([k, p]) => (
          <button key={k} onClick={() => setProfileField("plan", k)} className="rounded-2xl px-3.5 py-2.5 text-left active:scale-95 transition-transform flex-shrink-0"
            style={{ background: profile.plan === k ? "rgba(255,138,76,.12)" : C.card, border: `1px solid ${profile.plan === k ? C.ember : C.line}` }}>
            <div className="fd font-semibold text-xs" style={{ color: profile.plan === k ? C.ember : C.text }}>{p.name}</div>
            <div className="fb text-xs" style={{ color: C.mut }}>{p.tag}</div>
          </button>
        ))}
      </div>

      <Card>
        <SectionTitle icon={todayW.rest ? Moon : Dumbbell} color={C.ember} right={
          <span className="fb text-xs" style={{ color: C.mut }}>{DOWS[new Date().getDay()]}</span>
        }>{todayW.t}</SectionTitle>

        {todayW.rest ? (
          <div>
            <div className="text-center py-3">
              <Moon size={26} style={{ color: C.aqua, margin: "0 auto" }} />
              <div className="fd font-semibold text-sm mt-2" style={{ color: C.text }}>Rest day — streak protected 🛡️</div>
              <div className="fb text-xs mt-1" style={{ color: C.mut }}>Recovery is where muscle is actually built. Keep it light today.</div>
            </div>
            <div className="flex flex-col gap-1.5">
              {todayW.ex.map((e) => (
                <div key={e.n} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: C.card2 }}>
                  <span className="fb text-sm" style={{ color: C.text }}>{e.n}</span>
                  <span className="fb text-xs" style={{ color: C.mut }}>{e.s}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <MuscleMap muscles={todayW.m || []} />
            <div className="h-1.5 rounded-full mb-3" style={{ background: C.card2 }}>
              <div className="h-1.5 rounded-full" style={{ width: `${(doneCount / todayW.ex.length) * 100}%`, background: C.ember, transition: "width .3s" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              {todayW.ex.map((e) => {
                const on = !!day.checks[e.n];
                return (
                  <div key={e.n} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: on ? "rgba(255,138,76,.07)" : C.card2, border: `1px solid ${on ? "rgba(255,138,76,.3)" : C.line}` }}>
                    <button onClick={() => toggle(e.n)} className="flex items-center justify-center rounded-md active:scale-90" style={{ width: 20, height: 20, background: on ? C.ember : "transparent", border: `1.5px solid ${on ? C.ember : C.mut}` }}>
                      {on && <Check size={13} color="#0C0E14" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="fb text-sm font-medium" style={{ color: on ? C.mut : C.text, textDecoration: on ? "line-through" : "none" }}>{e.n}</div>
                      <div className="fb text-xs" style={{ color: C.mut }}>{e.s}</div>
                    </div>
                    <button onClick={() => vid(e.n)} className="p-2 rounded-lg active:scale-90" style={{ background: C.card }} title="Watch form video">
                      <Play size={13} style={{ color: C.aqua }} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              {day.done ? (
                <Btn full ghost color={C.mint} onClick={() => mutDay({ done: false })}>✓ Completed — tap to undo</Btn>
              ) : (
                <Btn full color={C.mint} disabled={doneCount === 0} onClick={() => { mutDay({ done: true }); toast("Workout logged 🔥"); }}>Mark workout complete</Btn>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <button onClick={() => setCoreOpen(!coreOpen)} className="w-full flex items-center justify-between active:scale-95 transition-transform">
          <div className="flex items-center gap-2">
            <Flame size={16} style={{ color: C.rose }} />
            <span className="fd font-semibold text-sm" style={{ color: C.text }}>Belly-fat core circuit</span>
          </div>
          <ChevronDown size={16} style={{ color: C.mut, transform: coreOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>
        {coreOpen && (
          <div className="mt-3">
            <div className="fb text-xs mb-2.5" style={{ color: C.mut }}>
              Upper · lower · obliques — add 3–4×/week after your workout. Real talk: there's no spot reduction — your calorie deficit burns the belly fat, this builds the muscle underneath it.
            </div>
            <div className="flex flex-col gap-1.5">
              {CORE.map((e) => {
                const key = "Core: " + e.n;
                const on = !!day.checks[key];
                return (
                  <div key={e.n} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: on ? "rgba(248,113,128,.07)" : C.card2, border: `1px solid ${on ? "rgba(248,113,128,.3)" : C.line}` }}>
                    <button onClick={() => toggle(key)} className="flex items-center justify-center rounded-md active:scale-90" style={{ width: 20, height: 20, background: on ? C.rose : "transparent", border: `1.5px solid ${on ? C.rose : C.mut}` }}>
                      {on && <Check size={13} color="#0C0E14" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="fb text-sm font-medium" style={{ color: on ? C.mut : C.text, textDecoration: on ? "line-through" : "none" }}>{e.n}</div>
                      <div className="fb text-xs" style={{ color: C.mut }}>{e.s} · {e.g}</div>
                    </div>
                    <button onClick={() => vid(e.n)} className="p-2 rounded-lg active:scale-90" style={{ background: C.card }}>
                      <Play size={13} style={{ color: C.aqua }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon={Timer} color={C.aqua}>Rest timer</SectionTitle>
        <div className="flex items-center justify-between">
          <div className="fd font-extrabold" style={{ fontSize: 40, color: sec > 0 ? C.aqua : C.mut, lineHeight: 1 }}>
            {pad(Math.floor(sec / 60))}:{pad(sec % 60)}
          </div>
          <div className="flex gap-1.5">
            {[30, 60, 90, 120].map((s) => (
              <Chip key={s} color={C.aqua} active={total === s && !running} onClick={() => { setTotal(s); setSec(s); setRunning(false); }}>{s}s</Chip>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1"><Btn full color={C.aqua} onClick={() => { if (!running && sec === 0) setSec(total); setRunning(!running); }}>{running ? "Pause" : "Start rest"}</Btn></div>
          <Btn ghost color={C.mut} onClick={() => { setRunning(false); setSec(0); }}>Reset</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={ClipboardList} color={C.mut}>This week · {planDef.name}</SectionTitle>
        <div className="flex flex-col gap-1 mb-3">
          {WK.map((label, i) => {
            const w = workoutForDay(profile, i);
            return (
              <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: i === idx ? C.card2 : "transparent" }}>
                <span className="fb text-xs font-semibold" style={{ color: i === idx ? C.ember : C.mut, width: 34 }}>{label}</span>
                <span className="fb text-xs flex-1" style={{ color: i === idx ? C.text : C.mut }}>{w.t}</span>
                {w.rest && <Moon size={12} style={{ color: C.aqua }} />}
              </div>
            );
          })}
        </div>
        <div className="pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="fb text-xs mb-2" style={{ color: C.mut }}>Rest day (streak-safe) — shift it to match your workload:</div>
          <div className="flex gap-1.5">
            {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
              <button key={i} onClick={() => { setProfileField("restDay", i); toast(`Rest day moved to ${WK[i]} 🛡️`); }}
                className="flex-1 rounded-xl py-2 fb text-xs font-bold active:scale-90 transition-transform"
                style={{ background: restDay === i ? C.aqua : C.card2, color: restDay === i ? "#0C0E14" : C.mut, border: `1px solid ${restDay === i ? C.aqua : C.line}` }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================= CALENDAR + WEEKLY ============================= */
function CalendarCard({ data, restDay, streak }) {
  const [off, setOff] = useState(0);
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + off);
  const y = base.getFullYear(), m = base.getMonth();
  const label = base.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstWd = (new Date(y, m, 1).getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const todayKey = dkey();
  const now = new Date();
  let activeCount = 0;
  for (let d = 1; d <= dim; d++) { if (isActiveDay(data.days[dkey(new Date(y, m, d))])) activeCount++; }
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  return (
    <Card>
      <SectionTitle icon={CalendarDays} color={C.gold} right={
        <div className="flex items-center gap-1">
          <button onClick={() => setOff(off - 1)} className="p-1.5 rounded-lg active:scale-90" style={{ background: C.card2 }}><ChevronLeft size={13} style={{ color: C.mut }} /></button>
          <button onClick={() => { if (off < 0) setOff(off + 1); }} className="p-1.5 rounded-lg active:scale-90" style={{ background: C.card2, opacity: off < 0 ? 1 : 0.35 }}><ChevronRight size={13} style={{ color: C.mut }} /></button>
        </div>
      }>{label}</SectionTitle>
      <div className="flex items-center gap-5 mb-3">
        <div><span className="fd font-extrabold text-2xl" style={{ color: C.ember }}>{streak}</span><span className="fb text-xs ml-1.5" style={{ color: C.mut }}>day streak 🔥</span></div>
        <div><span className="fd font-extrabold text-2xl" style={{ color: C.mint }}>{activeCount}</span><span className="fb text-xs ml-1.5" style={{ color: C.mut }}>active days</span></div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
          <div key={i} className="text-center fb font-bold" style={{ fontSize: 10, color: i === restDay ? C.aqua : C.mut }}>{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={"x" + i} />;
          const dt = new Date(y, m, d);
          const k = dkey(dt);
          const dd = data.days[k];
          const isToday = k === todayKey;
          const future = dt > now && !isToday;
          const done = dd && dd.done;
          const act = isActiveDay(dd);
          const isRest = ((dt.getDay() + 6) % 7) === restDay;
          return (
            <div key={k} className="rounded-lg flex flex-col items-center justify-center" style={{
              height: 34,
              background: done ? C.ember : act ? C.card2 : "transparent",
              border: isToday ? `1.5px solid ${C.aqua}` : "1px solid rgba(36,43,58,.5)",
              opacity: future ? 0.3 : 1,
            }}>
              <span className="fb font-semibold" style={{ fontSize: 11, color: done ? "#0C0E14" : isRest && !act ? "rgba(139,147,167,.55)" : C.text }}>{d}</span>
              {act && !done && <div className="rounded-full" style={{ width: 4, height: 4, background: C.mint, marginTop: 1 }} />}
            </div>
          );
        })}
      </div>
      <div className="fb mt-2.5" style={{ fontSize: 10, color: C.mut }}>Orange = workout done · green dot = logged · blue ring = today · blue column = rest day</div>
    </Card>
  );
}

function WeeklyCard({ data, glasses }) {
  const tw = weekStats(data, weekKeys(0), glasses);
  const lw = weekStats(data, weekKeys(1), glasses);
  const rows = [
    ["Workouts done", tw.workouts, lw.workouts],
    ["Avg calories", tw.avgCal || "—", lw.avgCal || "—"],
    ["Avg protein (g)", tw.avgP || "—", lw.avgP || "—"],
    ["Water goal hit", tw.waterDays + "d", lw.waterDays + "d"],
    ["Avg steps", tw.avgSteps.toLocaleString(), lw.avgSteps.toLocaleString()],
  ];
  return (
    <Card>
      <SectionTitle icon={TrendingUp} color={C.mint}>Weekly analysis</SectionTitle>
      <div className="grid gap-y-1.5 gap-x-3 items-center" style={{ gridTemplateColumns: "1fr auto auto" }}>
        <div />
        <div className="fb text-xs font-bold text-right" style={{ color: C.text, minWidth: 60 }}>This wk</div>
        <div className="fb text-xs font-bold text-right" style={{ color: C.mut, minWidth: 60 }}>Last wk</div>
        {rows.map(([l, a, b]) => (
          <React.Fragment key={l}>
            <div className="fb text-xs" style={{ color: C.mut }}>{l}</div>
            <div className="fb text-xs font-semibold text-right" style={{ color: C.text }}>{a}</div>
            <div className="fb text-xs text-right" style={{ color: C.mut }}>{b}</div>
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}

/* ============================= PROGRESS TAB ============================= */
function ProgressTab({ profile, t, data, logWeight, curW, streak }) {
  const [showLog, setShowLog] = useState(false);
  const [wInput, setWInput] = useState("");
  const restDay = profile.restDay ?? 6;

  const weights = data.weights || [];
  const wChart = useMemo(() => weights.slice(-45).map((x) => ({ d: x.d.slice(5).replace("-", "/"), kg: x.kg })), [weights]);

  const last7 = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const day = data.days[dkey(dt)];
      const tt = dayTotals(day);
      arr.push({ d: DOWS[dt.getDay()], cal: rnd(tt.c), steps: day ? day.steps || 0 : 0, p: rnd(tt.p) });
    }
    return arr;
  }, [data]);

  const bmi = bmiOf(curW, profile.h);
  const [cat, catColor] = bmiCat(bmi);
  const bmiPos = Math.min(97, Math.max(3, ((bmi - 15) / 25) * 100));

  const first = weights.length ? weights[Math.max(0, weights.length - 8)] : null;
  const deltaKg = first ? +(curW - first.kg).toFixed(1) : 0;
  const loggedDays = last7.filter((x) => x.cal > 0);
  const avgCal = loggedDays.length ? rnd(loggedDays.reduce((a, x) => a + x.cal, 0) / loggedDays.length) : 0;
  const avgP = loggedDays.length ? rnd(loggedDays.reduce((a, x) => a + x.p, 0) / loggedDays.length) : 0;
  const avgSteps = rnd(last7.reduce((a, x) => a + x.steps, 0) / 7);

  let eta = null;
  if (weights.length >= 2) {
    const a = weights[Math.max(0, weights.length - 5)], b = weights[weights.length - 1];
    const daysN = Math.max(1, (new Date(b.d) - new Date(a.d)) / 86400000);
    const perWeek = ((b.kg - a.kg) / daysN) * 7;
    if (profile.goal === "lose" && perWeek < -0.05 && curW > profile.goalW) eta = Math.ceil((curW - profile.goalW) / -perWeek);
    if (profile.goal === "gain" && perWeek > 0.05 && curW < profile.goalW) eta = Math.ceil((profile.goalW - curW) / perWeek);
  }

  const ttStyle = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, color: C.text, fontSize: 12 };

  return (
    <div className="flex flex-col gap-3">
      <CalendarCard data={data} restDay={restDay} streak={streak} />
      <WeeklyCard data={data} glasses={t.glasses} />

      <Card>
        <SectionTitle icon={Scale} color={C.mint} right={<Btn small color={C.mint} onClick={() => setShowLog(true)}>+ Log weight</Btn>}>Weight</SectionTitle>
        <div className="flex items-end gap-2 mb-2">
          <div className="fd font-extrabold text-3xl" style={{ color: C.text }}>{curW}<span className="text-sm" style={{ color: C.mut }}> kg</span></div>
          {weights.length > 1 && (
            <span className="fb text-xs font-semibold mb-1 px-2 py-0.5 rounded-full" style={{ background: C.card2, color: deltaKg <= 0 ? C.mint : C.gold }}>
              {deltaKg > 0 ? "+" : ""}{deltaKg} kg recent
            </span>
          )}
          <span className="fb text-xs mb-1 ml-auto" style={{ color: C.mut }}>goal {profile.goalW} kg</span>
        </div>
        {wChart.length >= 2 ? (
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wChart} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <XAxis dataKey="d" tick={{ fill: C.mut, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fill: C.mut, fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
                <Tooltip contentStyle={ttStyle} />
                <ReferenceLine y={profile.goalW} stroke={C.mut} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="kg" stroke={C.mint} strokeWidth={2.5} dot={{ r: 3, fill: C.mint }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="fb text-xs py-6 text-center" style={{ color: C.mut }}>Log weight 2+ times to see your trend line. Weigh in every morning, same time.</div>
        )}
      </Card>

      <Card>
        <SectionTitle icon={TrendingUp} color={catColor}>BMI</SectionTitle>
        <div className="flex items-center gap-3 mb-3">
          <div className="fd font-extrabold text-3xl" style={{ color: C.text }}>{bmi.toFixed(1)}</div>
          <span className="fb text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.card2, color: catColor }}>{cat}</span>
        </div>
        <div className="relative h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${C.aqua} 0 14%, ${C.mint} 14% 40%, ${C.gold} 40% 60%, ${C.rose} 60% 100%)` }}>
          <div className="absolute rounded-full" style={{ left: `${bmiPos}%`, top: -4, width: 4, height: 18, background: C.text, transform: "translateX(-50%)" }} />
        </div>
        <div className="flex justify-between fb mt-1.5" style={{ color: C.mut, fontSize: 10 }}>
          <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Flame} color={C.ember}>Calories · last 7 days</SectionTitle>
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <XAxis dataKey="d" tick={{ fill: C.mut, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.mut, fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
              <Tooltip contentStyle={ttStyle} cursor={{ fill: "rgba(255,255,255,.04)" }} />
              <ReferenceLine y={t.cal} stroke={C.aqua} strokeDasharray="4 4" />
              <Bar dataKey="cal" radius={[6, 6, 0, 0]}>
                {last7.map((x, i) => (
                  <Cell key={i} fill={x.cal > t.cal && (profile.goal === "lose" || profile.goal === "recomp") ? C.rose : C.ember} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Footprints} color={C.aqua}>Steps · last 7 days</SectionTitle>
        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <XAxis dataKey="d" tick={{ fill: C.mut, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.mut, fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
              <Tooltip contentStyle={ttStyle} cursor={{ fill: "rgba(255,255,255,.04)" }} />
              <ReferenceLine y={t.stepsGoal} stroke={C.mut} strokeDasharray="4 4" />
              <Bar dataKey="steps" radius={[6, 6, 0, 0]}>
                {last7.map((x, i) => <Cell key={i} fill={x.steps >= t.stepsGoal ? C.mint : C.aqua} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Sparkles} color={C.gold}>Insights</SectionTitle>
        <div className="flex flex-col gap-2 fb text-sm" style={{ color: C.text }}>
          <div>🍽️ Avg intake: <b>{avgCal || "—"}</b> kcal <span style={{ color: C.mut }}>(target {t.cal})</span></div>
          <div>🥚 Avg protein: <b>{avgP || "—"}g</b> <span style={{ color: C.mut }}>(target {t.protein}g)</span></div>
          <div>👟 Avg steps: <b>{avgSteps.toLocaleString()}</b> <span style={{ color: C.mut }}>(goal {t.stepsGoal.toLocaleString()})</span></div>
          {eta && <div>🎯 At current pace: goal weight in about <b>{eta} week{eta !== 1 ? "s" : ""}</b></div>}
          <div style={{ color: C.mut, fontSize: 12 }}>BMR {t.bmr} · TDEE {t.tdee} · daily target {t.cal} kcal</div>
        </div>
      </Card>

      {showLog && (
        <Sheet title="Log today's weight" onClose={() => setShowLog(false)}>
          <input style={inputStyle} type="number" inputMode="decimal" placeholder={`${curW} kg`} value={wInput} onChange={(e) => setWInput(e.target.value)} autoFocus />
          <div className="fb text-xs mt-2" style={{ color: C.mut }}>Tip: weigh empty-stomach, same time every morning.</div>
          <div className="mt-4">
            <Btn full color={C.mint} disabled={!(parseFloat(wInput) > 25)} onClick={() => { logWeight(parseFloat(wInput)); setWInput(""); setShowLog(false); }}>Save weight</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ============================= PLAN TAB ============================= */
function PlanTab({ profile, t, plan, setPlan, toast, curW }) {
  const [view, setView] = useState("trainer");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const bank = await askClaude([{
        type: "text",
        text: `You are a certified Indian nutrition coach. Client: ${profile.age}y ${profile.gender}, ${curW}kg, ${profile.h}cm. Goal: ${GOAL_TXT[profile.goal]}. Diet: ${profile.diet === "veg" ? "pure vegetarian" : profile.diet === "egg" ? "vegetarian + eggs" : "non-vegetarian"}. Daily targets: ${t.cal} kcal, ${t.protein}g protein. Create a bank of realistic Indian home-style meal options. Respond with ONLY minified JSON, no markdown, exactly: {"b":[5 breakfast options],"l":[5 lunch options],"s":[4 snack options],"d":[5 dinner options]} where each option is {"n":"meal with portion sizes","c":kcal,"p":protein_g}. Size options so any one b+l+s+d combination totals about ${t.cal} kcal (breakfast ~25%, lunch ~32%, snack ~13%, dinner ~30%). Every option must be high-protein. Keep each name under 9 words.`,
      }]);
      if (!bank.b || !bank.l || !bank.s || !bank.d) throw new Error("bad shape");
      const next = { bank, ts: Date.now(), src: "ai" };
      setPlan(next); store.set("plan", next);
      toast("Fresh 7-day plan ready 🍽️");
    } catch (e) {
      const next = { bank: defaultBank(profile.diet), ts: Date.now(), src: "default" };
      setPlan(next); store.set("plan", next);
      toast("Offline plan loaded — regenerate later for an AI plan");
    }
    setLoading(false);
  };

  const days = useMemo(() => {
    if (!plan || !plan.bank) return [];
    const { b, l, s, d } = plan.bank;
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((name, i) => {
      const meals = [
        ["Breakfast", b[i % b.length]], ["Lunch", l[i % l.length]],
        ["Snack", s[i % s.length]], ["Dinner", d[i % d.length]],
      ];
      const tc = meals.reduce((a, [, mm]) => a + (mm ? mm.c : 0), 0);
      const tp = meals.reduce((a, [, mm]) => a + (mm ? mm.p : 0), 0);
      return { name, meals, tc, tp };
    });
  }, [plan]);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="fd font-bold text-base" style={{ color: C.text }}>Your diet blueprint</div>
            <div className="fb text-xs mt-0.5" style={{ color: C.mut }}>
              {t.cal} kcal · P {t.protein}g · C {t.carbs}g · F {t.fat}g · {t.glasses} glasses water
            </div>
          </div>
          <div className="rounded-2xl p-2.5" style={{ background: "rgba(94,234,180,.1)" }}><ClipboardList size={20} style={{ color: C.mint }} /></div>
        </div>
      </Card>

      <div className="flex rounded-2xl p-1" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        {[["trainer", "Trainer plan 📝"], ["ai", "AI plan ✨"]].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className="flex-1 fd font-semibold text-xs py-2.5 rounded-xl active:scale-95 transition-transform"
            style={{ background: view === k ? C.ember : "transparent", color: view === k ? "#0C0E14" : C.mut }}>
            {l}
          </button>
        ))}
      </div>

      {view === "trainer" && (
        <div className="flex flex-col gap-3">
          <div className="fb text-xs px-1" style={{ color: C.mut }}>Your trainer's fat-loss plan — translated to English. Follow the clock. ⏰</div>
          {TRAINER_DIET.map((slot) => (
            <Card key={slot.time}>
              <div className="flex items-start gap-3">
                <div style={{ minWidth: 70 }}>
                  <div className="fd font-bold text-sm" style={{ color: C.ember }}>{slot.time}</div>
                  <div className="fb" style={{ fontSize: 10, color: C.mut }}>{slot.tag}</div>
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  {slot.items.map((it, i) => (
                    <div key={i} className="fb text-sm" style={{ color: it.includes("only on") ? C.gold : C.text }}>• {it}</div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {view === "ai" && (
        <div className="flex flex-col gap-3">
          {!plan && (
            <Card>
              <div className="text-center py-4">
                <Sparkles size={26} style={{ color: C.ember, margin: "0 auto" }} />
                <div className="fd font-bold text-base mt-3" style={{ color: C.text }}>Generate your 7-day meal plan</div>
                <div className="fb text-xs mt-1 mb-4 px-4" style={{ color: C.mut }}>
                  AI builds Indian meals matched to your exact calories, protein and {profile.diet === "veg" ? "veg" : profile.diet === "egg" ? "veg + egg" : "non-veg"} preference.
                </div>
                <Btn onClick={generate} disabled={loading}>{loading ? "Cooking your plan…" : "Generate with AI"}</Btn>
              </div>
            </Card>
          )}
          {plan && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <span className="fb text-xs" style={{ color: C.mut }}>
                  {plan.src === "ai" ? "AI plan · tuned to your targets" : "Offline plan · approximate"}
                </span>
                <button onClick={generate} disabled={loading} className="fb text-xs font-semibold flex items-center gap-1 active:scale-95" style={{ color: C.ember }}>
                  <RefreshCw size={12} className={loading ? "scanning" : ""} /> {loading ? "Regenerating…" : "Regenerate"}
                </button>
              </div>
              {days.map((d) => (
                <Card key={d.name}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="fd font-semibold text-sm" style={{ color: C.text }}>{d.name}</span>
                    <span className="fb text-xs" style={{ color: C.mut }}>≈ {rnd(d.tc)} kcal · {rnd(d.tp)}g P</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {d.meals.map(([label, mm]) => mm ? (
                      <div key={label} className="flex items-start justify-between gap-3 rounded-xl px-3 py-2" style={{ background: C.card2 }}>
                        <div className="min-w-0">
                          <div className="fb font-semibold" style={{ color: C.ember, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</div>
                          <div className="fb text-sm" style={{ color: C.text }}>{mm.n}</div>
                        </div>
                        <div className="fb text-xs text-right flex-shrink-0" style={{ color: C.mut }}>{mm.c} kcal<br />{mm.p}g P</div>
                      </div>
                    ) : null)}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Card>
        <SectionTitle icon={Dumbbell} color={C.mint}>Protein cheat sheet · veg & non-veg</SectionTitle>
        <div className="grid grid-cols-1 gap-1">
          {PROTEIN_SHEET.map(([f, p]) => (
            <div key={f} className="flex items-center justify-between rounded-lg px-3 py-1.5" style={{ background: C.card2 }}>
              <span className="fb text-xs" style={{ color: C.text }}>{f}</span>
              <span className="fb text-xs font-bold" style={{ color: C.mint }}>{p}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Check} color={C.mint}>Rules that make it work</SectionTitle>
        <div className="fb text-sm flex flex-col gap-1.5" style={{ color: C.mut }}>
          <div>• Protein in every meal — it protects muscle and kills cravings.</div>
          <div>• {t.glasses} glasses of water spread through the day.</div>
          <div>• Swap any meal with another option of similar kcal + protein.</div>
          <div>• 80/20 rule: 80% from the plan, 20% flexible — consistency beats perfection.</div>
          <div>• Sleep 7–8 hours; recovery is where the body changes.</div>
          <div>• Weigh in every morning; judge by the weekly average, not one day.</div>
        </div>
      </Card>
    </div>
  );
}

/* ============================= SETTINGS SHEET ============================= */
function SettingsSheet({ profile, saveProfile, onClose, resetAll }) {
  const [f, setF] = useState({ ...profile });
  const [habit, setHabit] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Age"><input style={inputStyle} type="number" inputMode="numeric" value={f.age} onChange={(e) => set("age", e.target.value)} /></Field>
        <Field label="Height (cm)"><input style={inputStyle} type="number" inputMode="decimal" value={f.h} onChange={(e) => set("h", e.target.value)} /></Field>
        <Field label="Goal weight (kg)"><input style={inputStyle} type="number" inputMode="decimal" value={f.goalW} onChange={(e) => set("goalW", e.target.value)} /></Field>
        <Field label="Steps goal"><input style={inputStyle} type="number" inputMode="numeric" value={f.stepsGoal} onChange={(e) => set("stepsGoal", e.target.value)} /></Field>
      </div>
      <Field label="Goal">
        <div className="flex flex-wrap gap-2">{GOALS.map(([k, l]) => <Chip key={k} active={f.goal === k} onClick={() => set("goal", k)}>{l}</Chip>)}</div>
      </Field>
      <Field label="Activity">
        <div className="flex flex-wrap gap-2">{ACT_LABELS.map(([k, l]) => <Chip key={k} color={C.aqua} active={f.activity === k} onClick={() => set("activity", k)}>{l}</Chip>)}</div>
      </Field>
      <Field label="Food preference">
        <div className="flex gap-2">{DIETS.map(([k, l]) => <Chip key={k} color={C.mint} active={f.diet === k} onClick={() => set("diet", k)}>{l}</Chip>)}</div>
      </Field>
      <Field label="Weekly rest day (streak-safe)">
        <div className="flex gap-1.5">
          {WK.map((l, i) => (
            <Chip key={l} color={C.aqua} active={(f.restDay ?? 6) === i} onClick={() => set("restDay", i)}>{l.slice(0, 2)}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Water reminder (while app is open)">
        <div className="flex flex-wrap gap-2">
          {[[0, "Off"], [30, "30 min"], [45, "45 min"], [60, "60 min"], [90, "90 min"]].map(([v, l]) => (
            <Chip key={v} color={C.aqua} active={f.remindMin === v} onClick={() => set("remindMin", v)}>{l}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Daily habits">
        <div className="flex flex-col gap-1.5 mb-2">
          {(f.habits || []).map((h) => (
            <div key={h} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: C.card2 }}>
              <span className="fb text-sm" style={{ color: C.text }}>{h}</span>
              <button onClick={() => set("habits", f.habits.filter((x) => x !== h))} className="p-1 active:scale-90"><X size={14} style={{ color: C.rose }} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Add habit e.g. No junk food" value={habit} onChange={(e) => setHabit(e.target.value)} />
          <Btn small color={C.mint} onClick={() => { const h = habit.trim(); if (h && !(f.habits || []).includes(h) && (f.habits || []).length < 8) { set("habits", [...(f.habits || []), h]); setHabit(""); } }}>Add</Btn>
        </div>
      </Field>
      <div className="mt-4">
        <Btn full onClick={() => {
          saveProfile({
            ...f,
            age: num(f.age, profile.age), h: num(f.h, profile.h), goalW: num(f.goalW, profile.goalW),
            stepsGoal: Math.max(1000, num(f.stepsGoal, 8000)),
            restDay: f.restDay ?? 6,
          });
          onClose();
        }}>Save settings</Btn>
      </div>
      <div className="mt-3">
        {!confirmReset ? (
          <Btn full ghost color={C.rose} onClick={() => setConfirmReset(true)}>Reset all data…</Btn>
        ) : (
          <Btn full color={C.rose} onClick={resetAll}>Tap again to permanently erase everything</Btn>
        )}
      </div>
    </Sheet>
  );
}

/* ============================= ROOT APP ============================= */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState({ days: {}, weights: [] });
  const [plan, setPlan] = useState(null);
  const [tab, setTab] = useState("home");
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [now, setNow] = useState(Date.now());
  const lastWaterRef = useRef(Date.now());

  const toast = (msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, msg }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3200);
  };

  useEffect(() => {
    (async () => {
      const [p, d, pl] = await Promise.all([store.get("profile"), store.get("data"), store.get("plan")]);
      if (p) setProfile({ restDay: 6, plan: "trainer", ...p });
      if (d && d.days) setData({ days: d.days || {}, weights: d.weights || [] });
      if (pl) setPlan(pl);
      setLoading(false);
    })();
  }, []);

  const today = dkey();
  const day = data.days[today] || emptyDay();
  const curW = (data.weights && data.weights.length) ? data.weights[data.weights.length - 1].kg : (profile ? profile.w : 0);
  const t = profile ? calcTargets(profile, curW) : null;
  const tot = dayTotals(day);
  const restDay = profile ? (profile.restDay ?? 6) : 6;
  const streak = useMemo(() => calcStreak(data.days, restDay), [data, restDay]);

  const saveData = (next) => { setData(next); store.set("data", next); };
  const saveProfile = (p) => { setProfile(p); store.set("profile", p); };

  const mutDay = (patch) => {
    if (patch.water != null && patch.water > day.water) lastWaterRef.current = Date.now();
    const nextDay = { ...emptyDay(), ...day, ...patch };
    saveData({ ...data, days: { ...data.days, [today]: nextDay } });
  };

  const addFoods = (meal, items) => {
    const foods = { ...day.foods, [meal]: [...(day.foods[meal] || []), ...items] };
    mutDay({ foods });
    toast(`Logged ${items.length} item${items.length !== 1 ? "s" : ""} ✓`);
  };
  const removeFood = (meal, i) => {
    const foods = { ...day.foods, [meal]: (day.foods[meal] || []).filter((_, x) => x !== i) };
    mutDay({ foods });
  };

  const logWeight = (kg) => {
    const weights = [...(data.weights || []).filter((x) => x.d !== today), { d: today, kg: +kg.toFixed(1) }];
    weights.sort((a, b) => (a.d < b.d ? -1 : 1));
    saveData({ ...data, weights });
    toast(`Weight saved: ${kg} kg`);
  };

  const setProfileField = (k, v) => saveProfile({ ...profile, [k]: v });

  useEffect(() => {
    if (!profile) return;
    const iv = setInterval(() => {
      setNow(Date.now());
      if (profile.remindMin > 0 && Date.now() - lastWaterRef.current > profile.remindMin * 60000) {
        toast("💧 Time for a glass of water!");
        lastWaterRef.current = Date.now();
      }
    }, 20000);
    return () => clearInterval(iv);
  }, [profile]);

  const nextRemindMs = profile && profile.remindMin > 0 ? profile.remindMin * 60000 - (now - lastWaterRef.current) : null;

  const resetAll = async () => {
    await store.del("profile"); await store.del("data"); await store.del("plan");
    setProfile(null); setData({ days: {}, weights: [] }); setPlan(null);
    setShowSettings(false); setTab("home");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.bg }}>
        <StyleTag />
        <div className="rounded-3xl flex items-center justify-center scanning" style={{ width: 64, height: 64, background: `linear-gradient(135deg, ${C.ember}, #FFB37E)` }}>
          <Flame size={30} color="#0C0E14" />
        </div>
        <div className="fd font-bold mt-4" style={{ color: C.text }}>FitAI</div>
      </div>
    );
  }

  if (!profile) return (<><StyleTag /><Onboarding onDone={(p) => { saveProfile(p); toast(`Welcome, ${p.name}! Let's go 🔥`); }} /></>);

  const TABS = [
    ["home", Home, "Home"], ["food", Utensils, "Food"], ["train", Dumbbell, "Train"],
    ["progress", TrendingUp, "Progress"], ["plan", ClipboardList, "Plan"],
  ];

  return (
    <div className="min-h-screen fb" style={{ background: C.bg }}>
      <StyleTag />
      <div className="max-w-md mx-auto px-4 pt-6" style={{ paddingBottom: 110 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="fd font-extrabold text-xl" style={{ color: C.text }}>
              {tab === "home" ? `Hi, ${profile.name}` : tab === "food" ? "Food log" : tab === "train" ? "Training" : tab === "progress" ? "Progress" : "Diet plan"}
            </div>
            <div className="fb text-xs mt-0.5" style={{ color: C.mut }}>{niceDate()}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <Flame size={13} style={{ color: C.ember }} />
              <span className="fd font-bold text-xs" style={{ color: C.text }}>{streak}</span>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-full active:scale-90" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <Settings size={15} style={{ color: C.mut }} />
            </button>
          </div>
        </div>

        {tab === "home" && <HomeTab profile={profile} t={t} day={day} tot={tot} mutDay={mutDay} goTab={setTab} nextRemindMs={nextRemindMs} curW={curW} />}
        {tab === "food" && <FoodTab t={t} day={day} tot={tot} addFoods={addFoods} removeFood={removeFood} toast={toast} />}
        {tab === "train" && <TrainTab profile={profile} day={day} mutDay={mutDay} setProfileField={setProfileField} toast={toast} />}
        {tab === "progress" && <ProgressTab profile={profile} t={t} data={data} logWeight={logWeight} curW={curW} streak={streak} />}
        {tab === "plan" && <PlanTab profile={profile} t={t} plan={plan} setPlan={setPlan} toast={toast} curW={curW} />}
      </div>

      <div className="fixed left-0 right-0 z-40 flex flex-col items-center gap-2 pointer-events-none" style={{ bottom: 96 }}>
        {toasts.map((x) => (
          <div key={x.id} className="rise fb text-sm px-4 py-2.5 rounded-2xl" style={{ background: "#1E2432", border: `1px solid ${C.line}`, color: C.text, boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
            {x.msg}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30" style={{ background: "rgba(12,14,20,.92)", backdropFilter: "blur(14px)", borderTop: `1px solid ${C.line}` }}>
        <div className="max-w-md mx-auto flex justify-around px-2 pt-2 pb-5">
          {TABS.map(([k, Icon, label]) => (
            <button key={k} onClick={() => setTab(k)} className="flex flex-col items-center gap-1 px-3 py-1 active:scale-90 transition-transform">
              <Icon size={20} style={{ color: tab === k ? C.ember : C.mut }} />
              <span className="fb font-medium" style={{ fontSize: 10, color: tab === k ? C.ember : C.mut }}>{label}</span>
              <div className="rounded-full" style={{ width: 4, height: 4, background: tab === k ? C.ember : "transparent" }} />
            </button>
          ))}
        </div>
      </div>

      {showSettings && <SettingsSheet profile={profile} saveProfile={saveProfile} onClose={() => setShowSettings(false)} resetAll={resetAll} />}
    </div>
  );
}
