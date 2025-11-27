const API_BASE = '/api/tickets';

const ownerFilter = document.getElementById('owner-filter');
const groupFilter = document.getElementById('group-filter');
const ticketBody = document.getElementById('ticket-body');
const exportBtn = document.getElementById('export-pdf-btn');

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
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const filteredTickets = tickets.filter(t => {
    const ownerVal = (ownerFilter.value || '').toLowerCase();
    const groupVal = groupFilter.value;
    if (groupVal && t.group !== groupVal) return false;
    if (ownerVal && !(t.owner || '').toLowerCase().includes(ownerVal)) return false;
    return true;
  });

  const body = filteredTickets.map(t => [
    t.itemName || '',
    t.owner || '',
    t.dueDate || '',
    t.priority || '',
    t.group || ''
  ]);

  doc.text('Ticket Report', 14, 15);
  doc.autoTable({
    head: [['Item name', 'Owner', 'Due date', 'Priority', 'Group']],
    body,
    startY: 20
  });

  doc.save('ticket-report.pdf');
});

loadTickets();
