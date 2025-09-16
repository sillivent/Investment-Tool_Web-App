// server.js
import express from "express";
import cors from "cors";
import yahooFinance from "yahoo-finance2";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, "frontend")));

app.use((req, res, next) => {
  console.log('Request URL:', req.url);
  next();
});

app.get("/", (req, res, next) => {
  next();
});

app.get("/index.html", (req, res, next) => {
  next();
});

// Remove explicit route for editable_table.html to let static middleware handle it

app.get("/editable_table.html", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "editable_table.html"));
});


// Fetch equity info by symbol
app.get("/api/equity/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const quote = await yahooFinance.quoteSummary(symbol, { modules: ["price", "summaryDetail", "summaryProfile", "incomeStatementHistory"] });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/indexes", async (req, res) => {
  try {
    const symbols = ['^DJI', '^GSPC', '^IXIC'];
    const data = {};
    for (const symbol of symbols) {
      const quote = await yahooFinance.quote(symbol);
      data[symbol] = {
        price: quote.regularMarketPrice,
        change: quote.regularMarketChangePercent * 100 // Convert to percentage
      };
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
