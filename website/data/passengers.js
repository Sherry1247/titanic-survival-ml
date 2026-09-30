import { MODEL_REPORT } from "./model-results.js";

const className = (pclass, lang) => lang === "zh" ? `${pclass}等舱` : `Class ${pclass}`;
const ageLabel = (age, lang) => lang === "zh" ? `${age}岁` : `age ${age}`;

function avatarFor(passenger) {
  if (passenger.age < 13) return passenger.sex === "female" ? "👧" : "👦";
  return passenger.sex === "female" ? "👩" : "👨";
}

export const PASSENGERS = Object.freeze(MODEL_REPORT.passengers.map((passenger) => ({
  ...passenger,
  emoji: avatarFor(passenger),
  priorityPoints: Math.round((1 - passenger.probability) * 15) + 5,
  details: {
    en: {
      meta: `${className(passenger.pclass, "en")} · ${ageLabel(passenger.age, "en")}`,
      clue: `Family group: ${passenger.familySize} · outcome locked`,
    },
    zh: {
      meta: `${className(passenger.pclass, "zh")} · ${ageLabel(passenger.age, "zh")}`,
      clue: `同行家庭人数：${passenger.familySize} · 历史结果已锁定`,
    },
  },
})));

export function getPassenger(id) {
  return PASSENGERS.find((passenger) => passenger.id === id) ?? null;
}

export function getPassengerDetails(passenger, lang) {
  return passenger.details[lang] ?? passenger.details.en;
}
