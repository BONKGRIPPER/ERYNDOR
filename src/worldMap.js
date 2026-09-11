// Coordinates in the supplied 1752 × 898 atlas. See assets/maps/README.md.
import '../assets/maps/world-map-layout.js';
export const WORLD = globalThis.ERYNDOR_MAP_LAYOUT.world;
export const MAP_PLACES = globalThis.ERYNDOR_MAP_LAYOUT.places;
export const MAP_ROUTES = globalThis.ERYNDOR_MAP_LAYOUT.routes;
export function visiblePlaces(visited, roads) {
  const visible = new Set(Object.keys(visited).filter(id => visited[id] && MAP_PLACES[id]));
  roads.forEach(r => { if (visited[r.from] || visited[r.to]) { visible.add(r.from); visible.add(r.to); } });
  return visible;
}
