let totalMarks = 0;
let minPass = 0;
let refTable = [];

function enableEntry() {
  const radio = document.querySelector('input[name="totalMarks"]:checked');
  if (!radio) return;
  
  totalMarks = parseInt(radio.value);
  minPass = totalMarks === 100 ? 33 : 17;
  
  // Check clipboard when radio is clicked
  checkClipboardAndProcess();
}

function checkClipboardAndProcess() {
  // Try to read clipboard
  navigator.clipboard.readText().then(text => {
    if (!text.trim()) {
      // No clipboard data - show text box (keep radio selected)
      showManualEntry();
      return;
    }
    
    // Try to process clipboard marks
    const result = validateMarks(text);
    
    if (result.success) {
      // Valid marks with proper spread - generate everything directly
      processMarks(text);
      finalizeUIAfterInput();
      showNotification('pasteNotification');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 150);
    } else {
      // Invalid marks - show error, PASTE the invalid data into textbox, KEEP RADIO SELECTED
      alert(result.message);
      document.getElementById('mainInputArea').value = text; // Paste the invalid data
      showManualEntry(); // Show text box but DON'T deselect radio
      // DO NOT CALL deselectRadio() here
    }
  }).catch(err => {
    // Can't read clipboard - show text box (keep radio selected)
    showManualEntry();
  });
}

function validateMarks(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const passingMarks = [];
  const allValidMarks = [];
  
  for (const line of lines) {
    const num = parseFloat(line);
    if (!isNaN(num) && num >= 0 && num <= totalMarks) {
      allValidMarks.push(num);
      if (num >= minPass) {
        passingMarks.push(num);
      }
    }
    // Ignore non-numeric entries (absent, A, AB, - etc.)
  }
  
  // Need at least 2 passing marks
  if (passingMarks.length < 2) {
    return { 
      success: false, 
      message: "Need at least 2 students with passing marks to create grade table." 
    };
  }
  
  // Check if all passing marks are the same
  const uniquePassMarks = [...new Set(passingMarks)];
  if (uniquePassMarks.length === 1) {
    return { 
      success: false, 
      message: "Invalid marks! All passing marks are identical. Cannot create grade ranges." 
    };
  }
  
  // Find highest and lowest passing marks
  const highestPass = Math.max(...passingMarks);
  const lowestPass = Math.min(...passingMarks);
  
  // Check if range between highest and lowest is less than 7 (need at least 8 marks for 8 grades)
  const passRange = highestPass - lowestPass;
  if (passRange < 7) {
    return { 
      success: false, 
      message: "Invalid marks! Range between highest and lowest passing marks is too small to create 8 grades." 
    };
  }
  
  return { success: true, highestPass, lowestPass };
}

function showManualEntry() {
  document.getElementById('entryArea').style.display = 'block';
  document.getElementById('mainInputArea').focus();
}

function deselectRadio() {
  document.querySelectorAll('input[name="totalMarks"]').forEach(r => r.checked = false);
  totalMarks = 0;
  minPass = 0;
}

function clearMainInput() {
  document.getElementById('mainInputArea').value = '';
  document.getElementById('mainInputArea').focus();
}

function processFromMainArea() {
  const text = document.getElementById('mainInputArea').value.trim();
  if (!text) {
    alert("Please enter or paste at least one mark / status.");
    return;
  }
  
  // Use current totalMarks and minPass (which are still set from radio button)
  const result = validateMarks(text);
  if (result.success) {
    processMarks(text);
    finalizeUIAfterInput();
    showNotification('pasteNotification');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 150);
  } else {
    alert(result.message);
    // Keep the text in textbox for user to edit
  }
}

function processMarks(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  lines.forEach(line => {
    const num = parseFloat(line);
    if (!isNaN(num)) {
      if (num >= 0 && num <= totalMarks) {
        entries.push({type: 'mark', value: num});
      } else {
        entries.push({type: 'mark', value: num, invalid: true});
      }
    } else {
      entries.push({type: 'absent', value: line || 'A'});
    }
  });
  if (entries.length === 0) {
    alert("No valid marks found in the content.");
    return;
  }
  createMarksTable(entries, true);
}

function createMarksTable(entries = null, isPasted = false) {
  const n = entries ? entries.length : 0;
  if (n === 0) return;
  const container = document.getElementById('marksTableContainer');
  container.innerHTML = '<h3>Student Marks</h3>';
  container.classList.add('visible');
  const table = document.createElement('table');
  table.id = 'marksTable';
  table.innerHTML = `<tr><th>S.No</th><th>Mark / Status</th><th>Grade</th></tr>`;
  for (let i = 1; i <= n; i++) {
    let cellContent = '';
    let extraClass = '';
    if (entries && entries[i-1]) {
      const e = entries[i-1];
      if (e.type === 'mark') {
        cellContent = `<input type="number" min="0" max="${totalMarks}" value="${e.value}" ${e.invalid?'class="invalid"':''} oninput="validateMark(this); updateAllGrades()">`;
      } else {
        cellContent = `<input type="text" value="${e.value}" class="absent-input" oninput="updateAllGrades()">`;
        extraClass = 'absent-row';
      }
    } else {
      cellContent = `<input type="number" min="0" max="${totalMarks}" oninput="validateMark(this); updateAllGrades()">`;
    }
    const row = document.createElement('tr');
    row.className = extraClass;
    row.innerHTML = `<td>${i}</td><td>${cellContent}</td><td class="grade">-</td>`;
    table.appendChild(row);
  }
  container.appendChild(table);
  const btnDiv = document.createElement('div');
  btnDiv.style.textAlign = 'center';
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'Copy Grades to Clipboard';
  copyBtn.disabled = true;
  copyBtn.onclick = copyGrades;
  btnDiv.appendChild(copyBtn);
  container.appendChild(btnDiv);
  document.getElementById('refTableContainer').innerHTML = '';
  document.getElementById('summaryContainer').innerHTML = '';
  document.getElementById('infoText').textContent = '';
  if (entries) updateAllGrades();
}

function validateMark(input) {
  const v = parseFloat(input.value);
  input.classList.toggle('invalid', isNaN(v) || v < 0 || v > totalMarks);
}

function isAbsentValue(val) {
  if (!val) return true;
  const s = val.toString().trim().toUpperCase();
  return ['A', 'ABSENT', 'AB', '-', ''].includes(s);
}

function getValidMarks() {
  const inputs = document.querySelectorAll('#marksTable input[type="number"]');
  return Array.from(inputs)
    .map(inp => parseFloat(inp.value))
    .filter(v => !isNaN(v) && v >= 0 && v <= totalMarks);
}

function getPassingMarks() {
  const validMarks = getValidMarks();
  return validMarks.filter(m => m >= minPass);
}

function updateAllGrades() {
    const validMarks = getValidMarks();
    const copyBtn = document.querySelector('#marksTable ~ div button');

    if (validMarks.length < 1) {
        copyBtn.disabled = true;
        document.getElementById('summaryContainer').classList.remove('visible');
        return;
    }

    const passingMarks = getPassingMarks();
    
    // Need at least 2 passing marks
    if (passingMarks.length < 2) {
        alert("Need at least 2 students with passing marks to update grades.");
        return;
    }
    
    const top = Math.max(...passingMarks);
    const lowestPass = Math.min(...passingMarks);
    
    // Calculate step size for A1 to D1 (7 grades)
    // Total marks from top to lowestPass (inclusive)
    const marksRange = top - lowestPass + 1;
    
    // Step size for first 7 grades
    let step = Math.floor(marksRange / 7);
    if (step < 1) step = 1;
    
    buildReferenceTable(top, lowestPass, minPass, step);
    assignGradesToTable();
    showReferenceTable();

    const stats = calculateSummaryStats();
    renderSummaryTable(stats);

    updateInfoDisplay(top, lowestPass, step);
    copyBtn.disabled = false;
}

function buildReferenceTable(top, lowestPass, fixedMinPass, step) {
    refTable = [];
    const grades = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'];
    
    let currentHigh = top;
    
    // Build A1 to D1 (7 grades) with equal step size
    for (let i = 0; i < 7; i++) {
        let bandLow = currentHigh - (step - 1);
        
        // For D1, ensure it doesn't go below lowestPass
        if (i === 6) { // D1 is the 7th grade (index 6)
            bandLow = lowestPass;
        }
        
        refTable.push({
            grade: grades[i],
            min: bandLow,
            max: currentHigh
        });
        
        currentHigh = bandLow - 1;
    }
    
    // D2 stretches from currentHigh down to fixedMinPass
    if (currentHigh >= fixedMinPass) {
        refTable.push({
            grade: 'D2',
            min: fixedMinPass,
            max: currentHigh
        });
    } else {
        refTable.push({
            grade: 'D2',
            min: '-',
            max: '-'
        });
    }
    
    // Add E grade
    refTable.push({
        grade: 'E',
        min: 0,
        max: fixedMinPass - 1
    });
}

function assignGradesToTable() {
  const rows = document.querySelectorAll('#marksTable tr:not(:first-child)');
  rows.forEach(row => {
    const input = row.querySelector('input');
    const gradeCell = row.cells[2];
    if (!input) return;
    if (input.classList.contains('absent-input') || isAbsentValue(input.value)) {
      gradeCell.textContent = 'Absent';
      gradeCell.className = 'grade absent';
      return;
    }
    const mark = parseFloat(input.value);
    if (isNaN(mark)) {
      gradeCell.textContent = '-';
      gradeCell.className = 'grade';
      return;
    }
    const grade = getGrade(mark);
    gradeCell.textContent = grade;
    gradeCell.className = `grade grade-${grade.toLowerCase()}`;
  });
}

function getGrade(mark) {
  for (const entry of refTable) {
    if (entry.min === '-' || entry.max === '-') continue;
    if (mark >= entry.min && mark <= entry.max) return entry.grade;
  }
  return 'E';
}

function showReferenceTable() {
  const container = document.getElementById('refTableContainer');
  container.innerHTML = '<h3>Grading Reference</h3>';
  container.classList.add('visible');
  const table = document.createElement('table');
  
  table.innerHTML = `<tr><th>Marks Range</th><th>Grade</th><th>Count</th></tr>`;
  
  refTable.forEach(r => {
    let rangeStr = (r.min === '-' || r.max === '-') ? '-' : `${r.max} – ${r.min}`;
    const count = Array.from(document.querySelectorAll('#marksTable .grade'))
      .filter(cell => cell.textContent.trim() === r.grade).length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${rangeStr}</td>
      <td class="grade grade-${r.grade.toLowerCase()}">${r.grade}</td>
      <td><b>${count}</b></td>
    `;
    table.appendChild(tr);
  });
  container.appendChild(table);
}

function calculateSummaryStats() {
  const rows = document.querySelectorAll('#marksTable tr:not(:first-child)');
  let onRoll = rows.length;
  let present = 0;
  let absent = 0;
  let passCount = 0;
  let totalSum = 0;
  let highest = 0;
  rows.forEach(row => {
    const input = row.querySelector('input');
    if (!input) return;
    if (input.classList.contains('absent-input') || isAbsentValue(input.value)) {
      absent++;
    } else {
      const mark = parseFloat(input.value);
      if (!isNaN(mark) && mark >= 0 && mark <= totalMarks) {
        present++;
        totalSum += mark;
        highest = Math.max(highest, mark);
        if (mark >= minPass) passCount++;
      }
    }
  });
  const presentCount = present;
  const passPercent = presentCount > 0 ? ((passCount / presentCount) * 100).toFixed(2) : '0.00';
  const classAverage = onRoll > 0 ? (totalSum / onRoll).toFixed(2) : '0.00';
  return { onRoll, present, absent, passCount, passPercent, highest, classAverage };
}

function renderSummaryTable(stats) {
  const container = document.getElementById('summaryContainer');
  container.innerHTML = '<h3>Class Summary</h3>';
  container.classList.add('visible');
  const table = document.createElement('table');
  table.id = 'summaryTable';
  table.innerHTML = `
    <tr>
      <th>No On Roll</th><th>No. of Present</th><th>No. of Absent</th>
      <th>No of Pass</th><th>Pass %</th><th>Highest Mark</th><th>Class Average</th>
    </tr>
    <tr>
      <td>${stats.onRoll}</td><td>${stats.present}</td><td>${stats.absent}</td>
      <td>${stats.passCount}</td><td>${stats.passPercent}%</td>
      <td>${stats.highest}</td><td>${stats.classAverage}</td>
    </tr>
  `;
  container.appendChild(table);
}

function updateInfoDisplay(top, lowestStudent, step) {
  document.getElementById('infoText').innerHTML =
    `Highest: <b>${top}</b> • Lowest pass: <b>${lowestStudent}</b> • Step: <b>${step}</b>`;
}

function copyGrades() {
  const grades = Array.from(document.querySelectorAll('#marksTable .grade'))
    .map(cell => cell.textContent.trim())
    .filter(t => t !== '-' && t !== '');
  if (grades.length === 0) return;
  const text = grades.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showNotification('copyNotification');
  }).catch(() => {
    alert("Copy failed. Please select and copy manually.");
  });
}

function showNotification(id) {
  const el = document.getElementById(id);
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

function finalizeUIAfterInput() {
  document.getElementById('inputSection').style.display = 'none';
  document.getElementById('showInputBtn').style.display = 'block';
}

function resetToStart() {
  document.getElementById('marksTableContainer').classList.remove('visible');
  document.getElementById('marksTableContainer').innerHTML = '';
  document.getElementById('summaryContainer').classList.remove('visible');
  document.getElementById('summaryContainer').innerHTML = '';
  document.getElementById('refTableContainer').classList.remove('visible');
  document.getElementById('refTableContainer').innerHTML = '';
  document.getElementById('infoText').textContent = '';
  document.getElementById('mainInputArea').value = '';
  document.getElementById('entryArea').style.display = 'none';
  document.getElementById('inputSection').style.display = 'block';
  document.getElementById('showInputBtn').style.display = 'none';
  document.querySelectorAll('input[name="totalMarks"]').forEach(r => r.checked = false);
  totalMarks = minPass = 0;
  refTable = [];
}