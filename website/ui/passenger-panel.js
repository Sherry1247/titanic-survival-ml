import { getPassengerDetails } from "../data/passengers.js";

export function renderPassengerPanel({
  container,
  passengers,
  state,
  lang,
  t,
  onSelect,
  onBoard,
}) {
  container.innerHTML = passengers
    .map((passenger) => {
      const details = getPassengerDetails(passenger, lang);
      const selected = state.selectedPassengerId === passenger.id;
      const aboard = state.boardedPassengerIds.includes(passenger.id);
      const actionLabel = aboard ? t("aboard") : selected ? t("chosen") : t("choose");
      return `
        <article class="person ${selected ? "is-selected" : ""} ${aboard ? "is-aboard" : ""}"
          draggable="${!aboard}" data-id="${passenger.id}" aria-label="${passenger.name}">
          <button class="person__select" type="button" data-select="${passenger.id}" ${aboard ? "disabled" : ""}>
            <span class="person__avatar" aria-hidden="true">${passenger.emoji}</span>
            <span class="person__details">
              <strong>${passenger.name}</strong>
              <small>${details.meta}</small>
              <em>${details.clue}</em>
            </span>
            <span class="person__choice">${actionLabel}</span>
          </button>
          ${state.mode === "captain" && state.status === "running" && selected
            ? `<button class="person__board" type="button" data-board="${passenger.id}">${t("boardSelected")}</button>`
            : ""}
        </article>`;
    })
    .join("");

  container.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.select));
  });
  container.querySelectorAll("[data-board]").forEach((button) => {
    button.addEventListener("click", () => onBoard(button.dataset.board));
  });
  container.querySelectorAll(".person[draggable='true']").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", card.dataset.id);
      onSelect(card.dataset.id, { quiet: true });
    });
  });
}
