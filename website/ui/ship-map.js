import { nextRouteTarget, routeProgress } from "../engine/level-manager.js";

const TOKEN_POSITIONS = ["at-cabin", "at-stairs", "at-deck", "at-boat"];

export function renderShipMap({ map, state, passengers, t }) {
  const expected = state.mode === "passenger"
    ? nextRouteTarget(state.level.route, state.node)
    : null;

  map.querySelectorAll(".route-target").forEach((target) => {
    const isNext = state.status === "running" && target.dataset.target === expected;
    target.classList.toggle("is-next", isNext);
    target.setAttribute("aria-disabled", String(!isNext));
    target.tabIndex = isNext ? 0 : -1;
  });

  const token = map.querySelector("#player-token");
  TOKEN_POSITIONS.forEach((position) => token.classList.remove(position));
  token.classList.add(`at-${state.node}`);
  const selectedPassenger = passengers.find((item) => item.id === state.selectedPassengerId);
  token.textContent = selectedPassenger?.emoji ?? "✦";

  const lifeboat = map.querySelector("#lifeboat");
  lifeboat.classList.toggle(
    "is-next",
    state.mode === "captain" && state.status === "running" && Boolean(state.selectedPassengerId),
  );

  const seats = [...map.querySelectorAll(".seats i")];
  seats.forEach((seat, index) => {
    const passenger = passengers.find(
      (item) => item.id === state.boardedPassengerIds[index],
    );
    seat.classList.toggle("is-filled", Boolean(passenger));
    seat.textContent = passenger?.emoji ?? String(index + 1).padStart(2, "0");
    seat.title = passenger?.name ?? "";
  });

  const progress = routeProgress(state.level.route, state.node);
  const routeStatus = map.closest(".ship-board")?.querySelector("#route-status");
  if (routeStatus) {
    routeStatus.textContent = state.mode === "passenger"
      ? t("routeProgress", { current: progress.completed, total: progress.total })
      : t("clickOrDrag");
  }

  const water = map.querySelector(".water-level span");
  if (water) {
    const elapsed = 1 - state.seconds / state.level.duration;
    const level = state.status === "lost" ? 68 : state.status === "running" ? 8 + elapsed * 34 : 4;
    water.style.height = `${level}%`;
  }
}

export function bindDropTarget(element, callback) {
  element.addEventListener("dragover", (event) => {
    event.preventDefault();
    element.classList.add("drag-over");
  });
  element.addEventListener("dragleave", () => element.classList.remove("drag-over"));
  element.addEventListener("drop", (event) => {
    event.preventDefault();
    element.classList.remove("drag-over");
    callback(event.dataTransfer?.getData("text/plain"));
  });
}
