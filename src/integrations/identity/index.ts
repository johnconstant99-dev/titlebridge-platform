import { createPlaceholderAdapter } from "../adapter";

export const identityAdapter = createPlaceholderAdapter("identity", "Identity verification");
export async function verifyIdentity() {
  return identityAdapter.execute({});
}
