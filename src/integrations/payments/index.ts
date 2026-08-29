import { createPlaceholderAdapter } from "../adapter";

export const paymentsAdapter = createPlaceholderAdapter("payments", "Payments");
export async function createPayment() {
  return paymentsAdapter.execute({});
}
