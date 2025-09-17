// frontend/get_EquityInfo.js
export async function getEquityInfo(symbol) {
  if (!symbol) throw new Error("Symbol is required");
  const response = await fetch(`/api/get_EquityInfo?symbol=${symbol}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch equity info");
  }

  const data = await response.json();
  // Return the full quote data to allow access to all fields like price, summaryDetail, etc.
  return data;
}
