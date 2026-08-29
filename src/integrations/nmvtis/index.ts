import { createPlaceholderAdapter } from "../adapter";

export const nmvtisAdapter = createPlaceholderAdapter("nmvtis", "NMVTIS");
export async function queryNmvtis() {
  return nmvtisAdapter.execute({});
}
