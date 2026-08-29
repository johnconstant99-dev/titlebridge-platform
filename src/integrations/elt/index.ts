import { createPlaceholderAdapter } from "../adapter";

export const eltAdapter = createPlaceholderAdapter("elt", "Electronic lien and title");
export async function submitElt() {
  return eltAdapter.execute({});
}
