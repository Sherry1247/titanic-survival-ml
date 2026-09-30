export function captainPassengerPoints(passenger) {
  return Number(passenger?.priorityPoints ?? 0);
}

export function routeStepPoints(level) {
  return Number(level?.scorePerStep ?? 0);
}

export function passengerTimeBonus(secondsRemaining) {
  return Math.max(0, Math.ceil(secondsRemaining));
}
