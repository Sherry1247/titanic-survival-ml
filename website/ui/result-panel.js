export function renderResultPanel({ container, result, passengers, t, onReplay }) {
  if (!result) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  const won = result.status === "won";
  const title = won ? t("resultComplete") : t("resultTimeout");
  let summary = t("timeoutResult");
  if (won && result.mode === "captain") {
    summary = t("captainResult", {
      count: result.passengerIds.length,
      score: result.score,
    });
  }
  if (won && result.mode === "passenger") {
    summary = t("passengerResult", {
      seconds: Math.ceil(result.seconds),
      score: result.score,
    });
  }
  const chosen = result.passengerIds
    ?.map((id) => passengers.find((passenger) => passenger.id === id))
    .filter(Boolean) ?? [];
  const hintKey = result.mode === "captain" ? "resultHintCaptain" : "resultHintPassenger";

  container.hidden = false;
  container.innerHTML = `
    <div class="result-panel__mark" aria-hidden="true">${won ? "✓" : "⌛"}</div>
    <div class="result-panel__copy">
      <span class="eyebrow">${title}</span>
      <h3>${summary}</h3>
      ${chosen.length ? `<div class="result-panel__people">${chosen.map((person) => `<span>${person.emoji} ${person.name}</span>`).join("")}</div>` : ""}
      <p>${t(hintKey)}</p>
    </div>
    <button class="button button--gold" id="play-again" type="button">${t("playAgain")}</button>`;
  container.querySelector("#play-again").addEventListener("click", onReplay);
}
