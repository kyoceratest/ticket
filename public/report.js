const API_BASE = '/api/tickets';

const ownerFilter = document.getElementById('owner-filter');
const groupFilter = document.getElementById('group-filter');
const ticketBody = document.getElementById('ticket-body');
const exportBtn = document.getElementById('export-pdf-btn');
const printContainer = document.getElementById('print-container');

let tickets = [];

async function loadTickets() {
  const response = await fetch(API_BASE);
  tickets = await response.json();
  renderRows();
}

function renderRows() {
  const ownerVal = (ownerFilter.value || '').toLowerCase();
  const groupVal = groupFilter.value;

  const rows = tickets.filter(t => {
    if (groupVal && t.group !== groupVal) return false;
    if (ownerVal && !(t.owner || '').toLowerCase().includes(ownerVal)) return false;
    return true;
  }).map(t => {
    return `
      <tr>
        <td><input type="checkbox" class="row-select" data-id="${t.id}"></td>
        <td>${escapeHtml(t.itemName || '')}</td>
        <td>${escapeHtml(t.owner || '')}</td>
        <td>${escapeHtml(t.dueDate || '')}</td>
        <td>${escapeHtml(t.priority || '')}</td>
        <td>${escapeHtml(t.group || '')}</td>
      </tr>
    `;
  }).join('');

  ticketBody.innerHTML = rows;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

ownerFilter.addEventListener('input', renderRows);
groupFilter.addEventListener('change', renderRows);

exportBtn.addEventListener('click', () => {
  const selectedIds = Array.from(document.querySelectorAll('.row-select:checked')).map(input => input.getAttribute('data-id'));

  if (!selectedIds.length) {
    alert('Please select at least one ticket to include in the report.');
    return;
  }

  const selectedTickets = tickets.filter(t => selectedIds.includes(String(t.id)));

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);

  const sections = selectedTickets.map(t => {
    const notes = Array.isArray(t.adminNotes) ? t.adminNotes : [];
    const notesHtml = notes.length
      ? '<ul>' + notes.map(n => `<li><strong>${escapeHtml(n.time || '')}:</strong> ${escapeHtml(n.text || '')}</li>`).join('') + '</ul>'
      : '<p>No admin notes.</p>';

    return `
      <article class="print-ticket">
        <h2>${escapeHtml(t.itemName || '')}</h2>
        <p><strong>Status:</strong> ${escapeHtml(t.status || '')} | <strong>Group:</strong> ${escapeHtml(t.group || '')}</p>
        <p><strong>Owner:</strong> ${escapeHtml(t.owner || '')} | <strong>Email:</strong> ${escapeHtml(t.ownerEmail || '')}</p>
        <p><strong>Due date:</strong> ${escapeHtml(t.dueDate || '')} | <strong>Priority:</strong> ${escapeHtml(t.priority || '')}</p>
        <p><strong>Note:</strong> ${escapeHtml(t.note || '')}</p>
        <h3>Admin notes</h3>
        ${notesHtml}
      </article>
    `;
  }).join('');

  printContainer.innerHTML = `
    <h1>Ticket Report</h1>
    <p><strong>Date:</strong> ${dateStr}</p>
    ${sections}
  `;

  // Temporarily hide the interactive table when printing; CSS .print-only will show the report.
  document.body.classList.add('printing-report');
  window.print();
  document.body.classList.remove('printing-report');
});

loadTickets();
