// api/getEquityInfo.js
import yahooFinance from "yahoo-finance2";

export default async function (context, req) {
  const symbol = (req.query.symbol || req.body.symbol || "").toUpperCase();
  
  if (!symbol) {
    context.res = {
      status: 400,
      body: { error: "Symbol query parameter is required" },
    };
    return;
  }

  try {
    const quote = await yahooFinance.quoteSummary(symbol, { 
      modules: ["price", "summaryDetail", "summaryProfile", "incomeStatementHistory"] 
    });
    context.res = {
      status: 200,
      body: quote
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message }
    };
  }
}
