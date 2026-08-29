import { createPlaceholderAdapter } from "../adapter";

export const vehicleHistoryAdapter = createPlaceholderAdapter(
  "vehicle_history",
  "Vehicle history",
);
export async function lookupVehicleHistory() {
  return vehicleHistoryAdapter.execute({});
}
