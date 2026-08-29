import { createPlaceholderAdapter } from "../adapter";

export const stateDmvAdapter = createPlaceholderAdapter("state_dmv", "State motor-vehicle system");
export async function queryStateSystem() {
  return stateDmvAdapter.execute({});
}
