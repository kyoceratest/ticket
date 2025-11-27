const API_BASE = '/api/tickets';

const roleSelect = document.getElementById('role-select');
const currentRoleSpan = document.getElementById('current-role');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const priorityFilter = document.getElementById('priority-filter');
const groupFilter = document.getElementById('group-filter');
const ticketBody = document.getElementById('ticket-body');
const addTicketBtn = document.getElementById('add-ticket-btn');

const modal = document.getElementById('ticket-modal');
const modalTitle = document.getElementById('modal-title');
const ticketForm = document.getElementById('ticket-form');
const ticketIdInput = document.getElementById('ticket-id');
const itemNameInput = document.getElementById('item-name');
const statusInput = document.getElementById('status');
const ownerInput = document.getElementById('owner');
const ownerEmailInput = document.getElementById('owner-email');
const dueDateInput = document.getElementById('due-date');
const priorityInput = document.getElementById('priority');
const groupInput = document.getElementById('group');
const noteInput = document.getElementById('note');
const cancelBtn = document.getElementById('cancel-btn');

let tickets = [];

function setRole(role) {
  currentRoleSpan.textContent = `Role: ${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

roleSelect.addEventListener('change', () => {
  setRole(roleSelect.value);
});

addTicketBtn.addEventListener('click', () => {
  ticketIdInput.value = '';
  modalTitle.textContent = 'New ticket';
  ticketForm.reset();
  priorityInput.value = 'Medium';
  statusInput.value = 'New';
  openModal();
});

cancelBtn.addEventListener('click', () => {
  closeModal();
});

function openModal() {
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

async function loadTickets() {
  const response = await fetch(API_BASE);
  tickets = await response.json();
  renderTickets();
}

function renderTickets() {
  const term = (searchInput.value || '').toLowerCase();
  const statusVal = statusFilter.value;
  const priorityVal = priorityFilter.value;
  const groupVal = groupFilter.value;

  const rows = tickets.filter(t => {
    if (statusVal && t.status !== statusVal) return false;
    if (priorityVal && t.priority !== priorityVal) return false;
    if (groupVal && t.group !== groupVal) return false;

    if (term) {
      const haystack = [
        t.itemName,
        t.status,
        t.owner,
        t.priority,
        t.group,
        t.note
      ].join(' ').toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  }).map(renderRow).join('');

  ticketBody.innerHTML = rows;
}

function isOverdue(ticket) {
  if (!ticket.dueDate || ticket.status === 'Done') return false;
  const today = new Date();
  const due = new Date(ticket.dueDate);
  return due < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function renderRow(ticket) {
  const overdue = isOverdue(ticket);
  const highPriority = ticket.priority === 'High';
  const classes = [
    overdue ? 'row-overdue' : '',
    highPriority ? 'row-high-priority' : ''
  ].filter(Boolean).join(' ');

  return `
    <tr class="${classes}" data-id="${ticket.id}">
      <td><a href="status.html?id=${ticket.id}">${escapeHtml(ticket.itemName || '')}</a></td>
      <td>${escapeHtml(ticket.status || '')}</td>
      <td>${escapeHtml(ticket.owner || '')}</td>
      <td>${ticket.dueDate ? escapeHtml(ticket.dueDate) : ''}</td>
      <td>${escapeHtml(ticket.priority || '')}</td>
      <td>${escapeHtml(ticket.group || '')}</td>
      <td>${escapeHtml(ticket.note || '')}</td>
      <td class="actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </td>
    </tr>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

searchInput.addEventListener('input', renderTickets);
statusFilter.addEventListener('change', renderTickets);
priorityFilter.addEventListener('change', renderTickets);
groupFilter.addEventListener('change', renderTickets);

ticketBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr');
  if (!row) return;
  const id = row.getAttribute('data-id');
  const ticket = tickets.find(t => String(t.id) === String(id));
  if (!ticket) return;

  if (event.target.classList.contains('edit-btn')) {
    ticketIdInput.value = ticket.id;
    itemNameInput.value = ticket.itemName || '';
    statusInput.value = ticket.status || 'New';
    ownerInput.value = ticket.owner || '';
    ownerEmailInput.value = ticket.ownerEmail || '';
    dueDateInput.value = ticket.dueDate || '';
    priorityInput.value = ticket.priority || 'Medium';
    groupInput.value = ticket.group || '';
    noteInput.value = ticket.note || '';
    modalTitle.textContent = 'Edit ticket';
    openModal();
  }

  if (event.target.classList.contains('delete-btn')) {
    const role = roleSelect.value;
    if (role !== 'admin') {
      alert('Only Admin can delete tickets.');
      return;
    }
    if (confirm('Delete this ticket?')) {
      deleteTicket(id);
    }
  }
});

async function deleteTicket(id) {
  await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  tickets = tickets.filter(t => String(t.id) !== String(id));
  renderTickets();
}

ticketForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = ticketIdInput.value;
  const payload = {
    itemName: itemNameInput.value,
    status: statusInput.value,
    owner: ownerInput.value,
    ownerEmail: ownerEmailInput.value,
    dueDate: dueDateInput.value,
    priority: priorityInput.value,
    group: groupInput.value,
    note: noteInput.value
  };

  if (id) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const updated = await response.json();
    const index = tickets.findIndex(t => String(t.id) === String(id));
    if (index !== -1) tickets[index] = updated;
  } else {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const created = await response.json();
    tickets.push(created);
  }

  closeModal();
  renderTickets();
});

setRole(roleSelect.value);
loadTickets();
