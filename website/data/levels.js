const LEVELS = {
  captain: {
    id: "first-boat",
    mode: "captain",
    duration: 60,
    capacity: 4,
    route: [],
    wrongRoutePenalty: 0,
    scorePerStep: 0,
  },
  passenger: {
    id: "learn-the-deck",
    mode: "passenger",
    duration: 50,
    capacity: 1,
    route: ["cabin", "stairs", "deck", "boat"],
    wrongRoutePenalty: 5,
    scorePerStep: 25,
  },
};

export function getLevel(mode) {
  const level = LEVELS[mode];
  if (!level) throw new Error(`Unknown game mode: ${mode}`);
  return level;
}

export const MODES = Object.freeze(Object.keys(LEVELS));
