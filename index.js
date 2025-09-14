document.addEventListener('DOMContentLoaded', () => {
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  const nav = document.querySelector('nav ul');

  hamburgerMenu.addEventListener('click', () => {
    nav.classList.toggle('active');
    hamburgerMenu.classList.toggle('active');
  });

  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const addAnotherBtn = document.getElementById('addAnotherBtn');
  const updateBtn = document.getElementById('updateBtn');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  const downloadCsvBtn = document.getElementById('downloadCsvBtn');
  const portfolioDisplay = document.getElementById('portfolioDisplay');
  const aggregateDisplay = document.getElementById('aggregateDisplay');
  const accountValueEl = document.getElementById('accountValue');
  const totalCostBasisEl = document.getElementById('totalCostBasis');
  const positionsBody = document.getElementById('positionsBody');
  const aggregateBody = document.getElementById('aggregateBody');

  let portfolios = [];
  let currentPortfolio = null;

  uploadBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) {
      alert('Please select a file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Find header row (assume around row 11, but find by looking for 'Symbol')
      let headerRowIndex = 0;
      for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i].some(cell => cell && cell.toString().toLowerCase().includes('symbol'))) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = jsonData[headerRowIndex];
      const dataRows = jsonData.slice(headerRowIndex + 1);

      let positions = [];
      let currentPos = null;
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (row[0] && !row[0].toString().trim().startsWith(' ')) {
          // new position
          if (currentPos) positions.push(currentPos);
          currentPos = {
            Symbol: row[0],
            Name: "",
            "Aggregate Position": [{
              "Last Price $": row[1],
              "Value $": row[2],
              "Change $": row[3],
              "Change %": row[4],
              "% of Portfolio": row[5],
              "Qty #": row[6],
              "Cost/Share": row[7],
              "Day's Gain $": row[8],
              "Total Gain $": row[9],
              "Total Gain %": row[10],
              "YTD Gain %": row[11],
              "Dividend Yield %": row[12],
              "Est. Annual Income": row[13],
              "Ex-Div Date": row[14],
              "Dividend Pay Date": row[15],
              "Dividend": row[16]
            }],
            "Transaction Data": []
          };
        } else if (row[0] && row[0].toString().trim().startsWith(' ')) {
          // transaction
          if (currentPos) {
            const date = row[0].toString().trim();
            currentPos["Transaction Data"].push({
              "Number": (currentPos["Transaction Data"].length + 1).toString(),
              "Date": date,
              "Last Price $": row[1],
              "Value $": row[2],
              "Change $": row[3],
              "Change %": row[4],
              "% of Portfolio": row[5],
              "Qty #": row[6],
              "Cost/Share": row[7],
              "Day's Gain $": row[8],
              "Total Gain $": row[9],
              "Total Gain %": row[10],
              "YTD Gain %": row[11],
              "Dividend Yield %": row[12],
              "Est. Annual Income": row[13],
              "Ex-Div Date": row[14],
              "Dividend Pay Date": row[15],
              "Dividend": row[16]
            });
          }
        }
      }
      if (currentPos) positions.push(currentPos);

      processPortfolio(positions);
    };
    reader.readAsArrayBuffer(file);
  });

  addAnotherBtn.addEventListener('click', () => {
    fileInput.value = '';
    portfolioDisplay.style.display = 'none';
  });

  updateBtn.addEventListener('click', () => {
    // Update currentPortfolio from editable table
    const rows = positionsBody.querySelectorAll('tr');
    currentPortfolio.position.forEach((pos, index) => {
      const row = rows[index];
      const cells = row.querySelectorAll('td');
      pos.Symbol = cells[0].textContent;
      pos["Aggregate Position"][0]["Last Price $"] = cells[2].textContent;
      pos["Aggregate Position"][0]["Value $"] = cells[3].textContent.replace('$', '');
      pos["Aggregate Position"][0]["Change $"] = cells[4].textContent.replace('$', '');
      pos["Aggregate Position"][0]["Change %"] = cells[5].textContent.replace('%', '');
      pos["Aggregate Position"][0]["% of Portfolio"] = cells[6].textContent;
      pos["Aggregate Position"][0]["Qty #"] = cells[7].textContent;
      pos["Aggregate Position"][0]["Cost/Share"] = cells[8].textContent.replace('$', '');
      pos["Aggregate Position"][0]["Day's Gain $"] = cells[9].textContent.replace('$', '');
      pos["Aggregate Position"][0]["Total Gain $"] = cells[10].textContent.replace('$', '');
      pos["Aggregate Position"][0]["Total Gain %"] = cells[11].textContent.replace('%', '');
      pos["Aggregate Position"][0]["YTD Gain %"] = cells[12].textContent.replace('%', '');
      pos["Aggregate Position"][0]["Dividend Yield %"] = cells[13].textContent.replace('%', '');
      pos["Aggregate Position"][0]["Est. Annual Income"] = cells[14].textContent;
      pos["Aggregate Position"][0]["Ex-Div Date"] = cells[15].textContent;
      pos["Aggregate Position"][0]["Dividend Pay Date"] = cells[16].textContent;
      pos["Aggregate Position"][0]["Dividend"] = cells[17].textContent;
    });
    alert('JSON updated.');
  });

  downloadJsonBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(currentPortfolio, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    saveAs(dataBlob, 'portfolio.json');
  });

  downloadCsvBtn.addEventListener('click', () => {
    const csv = XLSX.utils.json_to_sheet(currentPortfolio.position.map(pos => ({
      Symbol: pos.Symbol,
      ...pos["Aggregate Position"][0]
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, csv, 'Portfolio');
    XLSX.writeFile(wb, 'portfolio.xlsx');
  });

  function processPortfolio(positions) {
    currentPortfolio = { position: positions };
    portfolios.push(currentPortfolio);

    displayPortfolio(positions);
    updateAggregate();
  }

  function displayPortfolio(positions) {
    let totalCostBasis = 0;
    let accountValue = 0;

    positions.forEach(pos => {
      const agg = pos["Aggregate Position"][0];
      totalCostBasis += parseFloat(agg["Qty #"]) * parseFloat(agg["Cost/Share"]);
      accountValue += parseFloat(agg["Value $"]);
    });

    accountValueEl.textContent = `Account Value: $${accountValue.toFixed(2)}`;
    totalCostBasisEl.textContent = `Total Cost Basis: $${totalCostBasis.toFixed(2)}`;

    positionsBody.innerHTML = '';
    positions.forEach(pos => {
      const agg = pos["Aggregate Position"][0];
      const row = document.createElement('tr');

      // Determine color class for change values
      const changeValue = parseFloat(agg['Change $'] || 0);
      const changePercent = parseFloat(agg['Change %'] || 0);
      const changeClass = (changeValue >= 0) ? 'positive' : 'negative';

      row.innerHTML = `
        <td contenteditable="true">${pos.Symbol}</td>
        <td contenteditable="true"></td>
        <td contenteditable="true">${agg['Last Price $']}</td>
        <td contenteditable="true">$${agg['Value $']}</td>
        <td contenteditable="true" class="${changeClass}">$${changeValue.toFixed(2)}</td>
        <td contenteditable="true" class="${changeClass}">${changePercent.toFixed(2)}%</td>
        <td contenteditable="true">${agg['% of Portfolio']}</td>
        <td contenteditable="true">${agg['Qty #']}</td>
        <td contenteditable="true">$${agg['Cost/Share']}</td>
        <td contenteditable="true" class="${changeClass}">$${agg["Day's Gain $"]}</td>
        <td contenteditable="true">$${agg['Total Gain $']}</td>
        <td contenteditable="true">${agg['Total Gain %']}%</td>
        <td contenteditable="true">${agg['YTD Gain %']}%</td>
        <td contenteditable="true">${agg['Dividend Yield %']}%</td>
        <td contenteditable="true">${agg['Est. Annual Income']}</td>
        <td contenteditable="true">${agg['Ex-Div Date']}</td>
        <td contenteditable="true">${agg['Dividend Pay Date']}</td>
        <td contenteditable="true">${agg['Dividend']}</td>
      `;
      positionsBody.appendChild(row);
    });

    portfolioDisplay.style.display = 'block';
  }

  function updateAggregate() {
    const aggregate = {};
    portfolios.forEach(portfolio => {
      portfolio.positions.forEach(pos => {
        const symbol = pos.Symbol;
        if (!aggregate[symbol]) {
          aggregate[symbol] = {
            totalShares: 0,
            totalCostBasis: 0,
            totalPositionValue: 0,
            prices: [],
            yields: [],
            yieldsOnCost: []
          };
        }
        aggregate[symbol].totalShares += pos.Shares;
        aggregate[symbol].totalCostBasis += pos['Cost Basis'];
        aggregate[symbol].totalPositionValue += pos['Position Value'];
        aggregate[symbol].prices.push(pos['Current Price']);
        aggregate[symbol].yields.push(parseFloat(pos['Dividend Yield']));
        aggregate[symbol].yieldsOnCost.push(parseFloat(pos['Dividend Yield on Cost']));
      });
    });

    aggregateBody.innerHTML = '';
    Object.keys(aggregate).forEach(symbol => {
      const agg = aggregate[symbol];
      const avgPrice = agg.prices.reduce((a, b) => a + b, 0) / agg.prices.length;
      const avgYield = agg.yields.reduce((a, b) => a + b, 0) / agg.yields.length;
      const avgYieldOnCost = agg.yieldsOnCost.reduce((a, b) => a + b, 0) / agg.yieldsOnCost.length;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${symbol}</td>
        <td>${agg.totalShares}</td>
        <td>$${agg.totalCostBasis.toFixed(2)}</td>
        <td>$${avgPrice.toFixed(2)}</td>
        <td>$${agg.totalPositionValue.toFixed(2)}</td>
        <td>${avgYield.toFixed(2)}%</td>
        <td>${avgYieldOnCost.toFixed(2)}%</td>
      `;
      aggregateBody.appendChild(row);
    });

    aggregateDisplay.style.display = 'block';
  }
});
