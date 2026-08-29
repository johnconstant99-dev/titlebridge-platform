import { createPlaceholderAdapter } from "../adapter";

export const vinAdapter = createPlaceholderAdapter("vin", "VIN decode");
export async function decodeVin() {
  return vinAdapter.execute({});
}
