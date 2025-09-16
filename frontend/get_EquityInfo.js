// frontend/get_EquityInfo.js
export async function getEquityInfo(symbol) {
  const response = await fetch(`/api/equity/${symbol}`);
  if (!response.ok) throw new Error("Failed to fetch equity info");
  const data = await response.json();
  return data;
}
