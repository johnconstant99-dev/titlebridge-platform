import { createPlaceholderAdapter } from "../adapter";

export const storageAdapter = createPlaceholderAdapter("storage", "Secure object storage");
export async function storeObject() {
  return storageAdapter.execute({});
}
