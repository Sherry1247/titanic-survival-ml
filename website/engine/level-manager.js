export function nextRouteTarget(route, currentNode) {
  const index = route.indexOf(currentNode);
  if (index < 0 || index >= route.length - 1) return null;
  return route[index + 1];
}

export function routeProgress(route, currentNode) {
  const index = Math.max(0, route.indexOf(currentNode));
  return {
    completed: index,
    total: Math.max(0, route.length - 1),
  };
}

export function isRouteComplete(route, currentNode) {
  return route.at(-1) === currentNode;
}
