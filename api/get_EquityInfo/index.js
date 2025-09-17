// api/getEquityInfo.js
//const yahooFinance = require("yahoo-finance2");
//import yahooFinance from "yahoo-finance2";
const yahooFinance = require("yahoo-finance2").default;

module.exports = async function (context, req) {
//export default async function (context, req) {
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
      modules: ["price", "summaryDetail", "summaryProfile", "incomeStatementHistory", "defaultKeyStatistics", 
        "financialData", "calendarEvents"] 
    });

    // Basic dividend info
    const summary = quote.summaryDetail || {};
    const financial = quote.financialData || {};
    const calendar = quote.calendarEvents || {};
    const cashflowHistory = quote.cashflowStatementHistory?.cashflowStatements || [];

    // Historical dividends for growth calculation
    const dividendsHistory = cashflowHistory
      .map(cs => cs.dividendsPaid || 0)
      .filter(val => val > 0);

    // Calculate approximate growth rate (CAGR over available years)
    let dividendGrowthRate = null;
    if (dividendsHistory.length > 1) {
      const first = dividendsHistory[dividendsHistory.length - 1];
      const last = dividendsHistory[0];
      const periods = dividendsHistory.length - 1;
      dividendGrowthRate = ((last / first) ** (1 / periods) - 1) * 100; // in %
    }

    // Infer dividend frequency
    let dividendFrequency = null;
    if (dividendsHistory.length >= 4) dividendFrequency = "Quarterly";
    else if (dividendsHistory.length === 2) dividendFrequency = "Semi-Annual";
    else if (dividendsHistory.length === 1) dividendFrequency = "Annual";

    const dividendInfo = {
      dividendRate: summary.dividendRate || financial.dividendRate || null,
      dividendYield: summary.dividendYield || financial.dividendYield || null,
      payoutRatio: financial.payoutRatio || null,
      exDividendDate: calendar.exDividendDate || null,
      dividendDate: calendar.dividendDate || null,
      dividendFrequency,
      dividendGrowthRate,
      dividendsHistory
    };

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
