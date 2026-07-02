import type { StoreState } from "@/store/slices";

// Journey history convention change: entries now record the day the travel
// happened (camping advances the campaign day afterwards) and end-days are no
// longer written to the history. Convert existing entries: camped entries were
// stamped with the post-camp day (shift back one), and stationary no-terrain
// entries were end-day records (drop them). Also backfill `start_location`,
// which undo now falls back to — campaigns have always started at Lone Tree
// Station.
function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 15) {
    for (const campaign of Object.values(state.data.campaigns ?? {})) {
      campaign.start_location ??= "lone_tree_station";

      let prevLocation: string | null | undefined = campaign.start_location;
      const history = [];
      for (const entry of campaign.history ?? []) {
        const stationary = entry.location === prevLocation;
        prevLocation = entry.location;
        if (stationary && !entry.path_terrain && !entry.camped) continue;
        history.push(entry.camped ? { ...entry, day: entry.day - 1 } : entry);
      }
      campaign.history = history;
    }
  }

  return state;
}

export default migrate;
