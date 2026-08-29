import { createPlaceholderAdapter } from "../adapter";

export const evrAdapter = createPlaceholderAdapter("evr", "Electronic vehicle registration");
export async function submitEvr() {
  return evrAdapter.execute({});
}
