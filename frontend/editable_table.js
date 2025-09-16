import { getEquityInfo } from "../get_EquityInfo.js";

document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#portfolioTable tbody");
  const addRowBtn = document.querySelector("#addRowBtn");

  // Function to update aggregate totals
  function updateAggregate() {
    const rows = tableBody.querySelectorAll('tr');
    let totalQty = 0;
    let totalCostBasis = 0;
    let totalDividendPayout = 0;
    let totalValue = 0;
    let totalDividendAnnualIncome = 0;
    let sumDividendYieldOnCosts = 0;
    let sumDividendYield = 0;
    let countDividendYieldOnCosts = 0;
    let countDividendYield = 0;

    rows.forEach(row => {
      const qty = parseFloat(row.cells[5].querySelector('input').value) || 0;
      const costBasis = parseFloat(row.cells[7].querySelector('input').value) || 0;
      const dividendPayout = parseFloat(row.cells[11].querySelector('input').value) || 0;
      const value = parseFloat(row.cells[6].querySelector('input').value) || 0;
      const dividendYieldOnCosts = parseFloat(row.cells[9].querySelector('input').value);
      const dividendYield = parseFloat(row.cells[8].querySelector('input').value);

      totalQty += qty;
      totalCostBasis += costBasis;
      totalDividendPayout += dividendPayout;
      totalValue += value;

      // Calculate total dividend annual income = sum of total dividend payout (which is dividend payout * qty * multiplier)
      // totalDividendPayout is per share dividend payout, so multiply by qty and frequency multiplier
      const frequency = row.cells[10].querySelector('input').value || "Quarterly";
      const multiplier = getDividendMultiplier(frequency);
      const totalDividendPayoutAnnual = dividendPayout * qty * multiplier;
      totalDividendAnnualIncome += totalDividendPayoutAnnual;

      if (!isNaN(dividendYieldOnCosts)) {
        sumDividendYieldOnCosts += dividendYieldOnCosts;
        countDividendYieldOnCosts++;
      }
      if (!isNaN(dividendYield)) {
        sumDividendYield += dividendYield;
        countDividendYield++;
      }
    });

    const avgDividendYieldOnCosts = countDividendYieldOnCosts > 0 ? (sumDividendYieldOnCosts / countDividendYieldOnCosts) : 0;
    const avgDividendYield = countDividendYield > 0 ? (sumDividendYield / countDividendYield) : 0;

    const aggregateBody = document.querySelector("#aggregateTable tbody");
    aggregateBody.innerHTML = '';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${totalQty}</td>
      <td>${totalCostBasis.toFixed(2)}</td>
      <td>${totalDividendPayout.toFixed(2)}</td>
      <td>${totalValue.toFixed(2)}</td>
      <td>${totalDividendAnnualIncome.toFixed(2)}</td>
      <td>${avgDividendYieldOnCosts.toFixed(2)}</td>
      <td>${avgDividendYield.toFixed(2)}</td>
    `;
    aggregateBody.appendChild(row);
  }

  // Function to fetch and display live index data
  async function fetchIndexData() {
    try {
      const response = await fetch('/api/indexes');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Map symbols to element IDs
      const symbolMap = {
        '^DJI': 'dow',
        '^GSPC': 'sp500',
        '^IXIC': 'nasdaq'
      };

      for (const symbol in data) {
        const price = data[symbol]?.price?.toFixed(2) || 'N/A';
        const changePercent = data[symbol]?.change || 0;

        const id = symbolMap[symbol];
        if (id) {
          document.getElementById(`${id}-value`).textContent = price;
          // Fix: update day change text content and color class
          const dayChangeElem = document.getElementById(`${id}-day`);
          dayChangeElem.textContent = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%';
          dayChangeElem.classList.remove('positive', 'negative');
          dayChangeElem.classList.add(changePercent >= 0 ? 'positive' : 'negative');

          // Clear month and year changes as backend does not provide them
          const monthChangeElem = document.getElementById(`${id}-month`);
          const yearChangeElem = document.getElementById(`${id}-year`);
          if (monthChangeElem) monthChangeElem.textContent = '';
          if (yearChangeElem) yearChangeElem.textContent = '';
        }
      }
    } catch (err) {
      console.error('Error fetching index data:', err);
    }
  }

  // Call fetchIndexData on page load
  fetchIndexData();

  // Fetch index data every 60 seconds
  setInterval(fetchIndexData, 60000);

  // Helper function to create input element with proper configuration
  function createInputElement(col, symbol, qty, cost) {
    const input = document.createElement("input");

    if (col === "Transaction Date") {
      input.type = "date";
      input.value = new Date().toISOString().split("T")[0];
    } else if (["Current Price", "Change in Value", "Price Paid", "Quantity", "Cost Basis", "Dividend Yield", "Dividend Yield on Costs", "Dividend Payout", "Total Dividend Payout", "Dividend Annual Income"].includes(col)) {
      input.type = "number";
    } else {
      input.type = "text";
    }

    if (col === "Ticker Symbol") input.value = symbol;
    if (col === "Quantity") input.value = qty;
    if (col === "Price Paid") input.value = cost;

    return input;
  }

  // Function to fetch and populate equity data
  async function fetchAndPopulateEquityData(row, ticker) {
    try {
      const data = await getEquityInfo(ticker);
      console.log("Raw API response for", ticker, ":", data); // Debug log
      if (data) {
        // Set values with corrected property access
        const currentPrice = data.price?.regularMarketPrice;
        const dividendRate = data.summaryDetail?.dividendRate;
        const dividendFrequencyText = data.summaryDetail?.dividendFrequency || null;

        console.log("Extracted data - Price:", currentPrice, "DividendRate:", dividendRate, "Dividend Frequency:", dividendFrequencyText); // Debug log

        row.cells[2].querySelector('input').value = currentPrice ? currentPrice.toFixed(2) : "";
        row.cells[3].querySelector('input').value = "0"; // Change in Value
        // Price Paid user
        // Quantity user
        const pricePaid = parseFloat(row.cells[4].querySelector('input').value) || 0;
        const qty = parseFloat(row.cells[5].querySelector('input').value) || 0;
        const costBasis = (pricePaid * qty).toFixed(2);
        row.cells[7].querySelector('input').value = costBasis;
        console.log("Calculated cost basis:", costBasis); // Debug log

        // Set Dividend Frequency from API or default to blank if not available
        const validFrequencies = ["Monthly", "Quarterly", "Semiannually", "Annually"];
        let frequency = "";
        if (dividendFrequencyText && validFrequencies.includes(dividendFrequencyText)) {
          frequency = dividendFrequencyText;
        }
        row.cells[10].querySelector('input').value = frequency;

        // Calculate Dividend Payout per share based on frequency
        let dividendPayoutPerShare = 0;
        if (dividendRate) {
          if (frequency === "Monthly") {
            dividendPayoutPerShare = dividendRate / 12;
          } else if (frequency === "Quarterly") {
            dividendPayoutPerShare = dividendRate / 4;
          } else if (frequency === "Semiannually") {
            dividendPayoutPerShare = dividendRate / 2;
          } else if (frequency === "Annually") {
            dividendPayoutPerShare = dividendRate;
          } else {
            dividendPayoutPerShare = dividendRate / 4; // Default to quarterly if frequency unknown
          }
        }
        row.cells[11].querySelector('input').value = dividendPayoutPerShare ? dividendPayoutPerShare.toFixed(2) : "";

        if (currentPrice && dividendPayoutPerShare) {
          const dividendYield = (dividendPayoutPerShare / currentPrice) * 100;
          row.cells[8].querySelector('input').value = dividendYield.toFixed(2);
        } else {
          row.cells[8].querySelector('input').value = "";
        }

        // Trigger calculations after fetching data
        updateCalculations(row);
      }
    } catch (err) {
      console.error("Error fetching equity info:", err);
    }
  }

  // Function to get dividend multiplier based on frequency
  function getDividendMultiplier(frequency) {
    switch (frequency.toLowerCase()) {
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'semiannually': return 2;
      case 'annually': return 1;
      default: return 4; // Default to quarterly
    }
  }

  // Function to handle calculation updates
  function updateCalculations(row) {
    const pricePaid = parseFloat(row.cells[4].querySelector('input').value) || 0;
    const qty = parseFloat(row.cells[5].querySelector('input').value) || 0;
    const currentPrice = parseFloat(row.cells[2].querySelector('input').value) || 0;
    const dividendPayoutPerShare = parseFloat(row.cells[11].querySelector('input').value) || 0;
    const frequency = row.cells[10].querySelector('input').value;

    // Update Cost Basis
    const costBasis = pricePaid * qty;
    row.cells[7].querySelector('input').value = costBasis.toFixed(2);

    // Update Value (Quantity * Current Price)
    const value = qty * currentPrice;
    row.cells[6].querySelector('input').value = value.toFixed(2);

    // Update Total Dividend Payout = Dividend Payout * Quantity * Multiplier
    const multiplier = getDividendMultiplier(frequency);
    const totalDividendPayout = dividendPayoutPerShare * qty * multiplier;
    row.cells[12].querySelector('input').value = totalDividendPayout.toFixed(2);

    // Update Change in Value (Value - Cost Basis)
    const changeInValue = value - costBasis;
    row.cells[3].querySelector('input').value = changeInValue.toFixed(2);

    // Recalculate Dividend Yield on Costs (Total Dividend Payout / Cost Basis * 100)
    if (costBasis && totalDividendPayout) {
      const yieldOnCosts = ((totalDividendPayout / costBasis) * 100).toFixed(2);
      row.cells[9].querySelector('input').value = yieldOnCosts;
    } else {
      row.cells[9].querySelector('input').value = "";
    }

    // Recalculate Dividend Yield (Total Dividend Payout / Value * 100)
    if (value && totalDividendPayout) {
      const dividendYield = (totalDividendPayout / value) * 100;
      row.cells[8].querySelector('input').value = dividendYield.toFixed(2);
    } else {
      row.cells[8].querySelector('input').value = "";
    }

    updateAggregate();
  }

  // Helper function to create a row
  function createRow(symbol = "", qty = "", cost = "") {
    const row = document.createElement("tr");

    const columns = [
      "Ticker Symbol", "Transaction Date", "Current Price", "Change in Value", "Price Paid",
      "Quantity", "Value", "Cost Basis", "Dividend Yield", "Dividend Yield on Costs",
      "Dividend Frequency", "Dividend Payout", "Total Dividend Payout"
    ];

    columns.forEach((col, index) => {
      const cell = document.createElement("td");
      const input = createInputElement(col, symbol, qty, cost);

      // Event: if ticker entered, fetch data
      if (col === "Ticker Symbol") {
        input.addEventListener("change", async () => {
          const ticker = input.value.trim().toUpperCase();
          if (ticker) {
            await fetchAndPopulateEquityData(row, ticker);
          }
        });
      }

      // Events for calculations
      if (col === "Price Paid" || col === "Quantity" || col === "Current Price") {
        input.addEventListener("input", () => updateCalculations(row));
      }

      if (col === "Cost Basis") {
        input.addEventListener("input", () => updateCalculations(row));
      }

      cell.appendChild(input);
      row.appendChild(cell);
    });

    // Add delete button
    const deleteCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.addEventListener("click", () => {
      row.remove();
      updateAggregate();
    });
    deleteCell.appendChild(deleteBtn);
    row.appendChild(deleteCell);

    tableBody.appendChild(row);
  }

  // Add first default blank row when page loads
  createRow();

  // Add new row when button clicked
  addRowBtn.addEventListener("click", () => {
    createRow();
  });
});
