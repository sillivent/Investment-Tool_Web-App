// csv_json_download.js

// Function to download data as JSON
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Function to download data as CSV
function downloadCSV(data, filename) {
  const csvContent = convertToCSV(data);
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper function to convert array of objects to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// Function to get portfolio data from table
function getPortfolioData() {
  const rows = document.querySelectorAll('#portfolioTable tbody tr');
  const data = [];
  rows.forEach(row => {
    const rowData = {};
    const inputs = row.querySelectorAll('input');
    const headers = ['Ticker Symbol', 'Transaction Date', 'Current Price', 'Change in Value', 'Price Paid', 'Quantity', 'Value', 'Cost Basis', 'Dividend Yield', 'Dividend Yield on Costs', 'Dividend Frequency', 'Dividend Payout', 'Total Dividend Payout'];
    inputs.forEach((input, index) => {
      rowData[headers[index]] = input.value;
    });
    data.push(rowData);
  });
  return data;
}

// Function to get aggregate data
function getAggregateData() {
  const aggregateBody = document.querySelector('#aggregateTable tbody');
  if (!aggregateBody) return [];
  const row = aggregateBody.querySelector('tr');
  if (!row) return [];
  const cells = row.querySelectorAll('td');
  const headers = ['Total Quantity', 'Total Cost Basis', 'Portfolio\'s Average Dividend Payout', 'Total Value', 'Total Dividend Annual Income', 'Portfolio\'s Dividend Yield on Costs', 'Portfolio\'s Dividend Yield'];
  const data = {};
  cells.forEach((cell, index) => {
    data[headers[index]] = cell.textContent;
  });
  return [data];
}

// Event listeners for download buttons
document.addEventListener('DOMContentLoaded', () => {
  const downloadPortfolioJsonBtn = document.getElementById('downloadPortfolioJsonBtn');
  const downloadPortfolioCsvBtn = document.getElementById('downloadPortfolioCsvBtn');
  const downloadAggregateJsonBtn = document.getElementById('downloadAggregateJsonBtn');
  const downloadAggregateCsvBtn = document.getElementById('downloadAggregateCsvBtn');

  if (downloadPortfolioJsonBtn) {
    downloadPortfolioJsonBtn.addEventListener('click', () => {
      const data = getPortfolioData();
      downloadJSON(data, 'portfolio.json');
    });
  }

  if (downloadPortfolioCsvBtn) {
    downloadPortfolioCsvBtn.addEventListener('click', () => {
      const data = getPortfolioData();
      downloadCSV(data, 'portfolio.csv');
    });
  }

  if (downloadAggregateJsonBtn) {
    downloadAggregateJsonBtn.addEventListener('click', () => {
      const data = getAggregateData();
      downloadJSON(data, 'aggregate.json');
    });
  }

  if (downloadAggregateCsvBtn) {
    downloadAggregateCsvBtn.addEventListener('click', () => {
      const data = getAggregateData();
      downloadCSV(data, 'aggregate.csv');
    });
  }
});
