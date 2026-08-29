import { createPlaceholderAdapter } from "../adapter";

export const esignatureAdapter = createPlaceholderAdapter("esignature", "Electronic signature");
export async function requestSignature() {
  return esignatureAdapter.execute({});
}
