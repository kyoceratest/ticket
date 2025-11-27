const API_BASE = '/api/tickets';

const roleSelect = document.getElementById('role-select');
const currentRoleSpan = document.getElementById('current-role');
const detailPanel = document.getElementById('detail-panel');
const detailTitle = document.getElementById('detail-title');
const detailContent = document.getElementById('detail-content');

let tickets = [];
let selectedId = null;

function setRole(role) {
  currentRoleSpan.textContent = `Role: ${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

roleSelect.addEventListener('change', () => {
  setRole(roleSelect.value);
  renderDetail();
});

async function loadTickets() {
  const response = await fetch(API_BASE);
  tickets = await response.json();
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  if (idParam) {
    selectedId = idParam;
  }
  renderDetail();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSelectedTicket() {
  if (!selectedId) return null;
  return tickets.find(t => String(t.id) === String(selectedId));
}

function renderDetail() {
  const ticket = getSelectedTicket();
  const role = roleSelect.value;

  if (!ticket) {
    detailTitle.textContent = 'Select a ticket';
    detailContent.classList.add('hidden');
    detailContent.innerHTML = '';
    return;
  }

  detailTitle.textContent = ticket.itemName || 'Ticket';
  detailContent.classList.remove('hidden');

  const canAdminEdit = role === 'admin';

  detailContent.innerHTML = `
    <div class="detail-section">
      <h3>Summary</h3>
      ${canAdminEdit ? `
      <p>
        <strong>Status:</strong>
        <select id="status-edit">
          <option value="New">New</option>
          <option value="In Progress">In Progress</option>
          <option value="Stuck">Stuck</option>
          <option value="Done">Done</option>
        </select>
        &nbsp;|&nbsp;
        <strong>Group:</strong>
        <select id="group-edit">
          <option value="New request">New request</option>
          <option value="Under development">Under development</option>
          <option value="Completed">Completed</option>
        </select>
      </p>
      ` : `
      <p>
        <strong>Status:</strong> ${escapeHtml(ticket.status || '')}
        &nbsp;|&nbsp;
        <strong>Group:</strong> ${escapeHtml(ticket.group || '')}
        &nbsp;|&nbsp;
        <strong>Owner:</strong> ${escapeHtml(ticket.owner || '')}
        &nbsp;|&nbsp;
        <strong>Email:</strong> ${escapeHtml(ticket.ownerEmail || '')}
      </p>
      `}
      <p><strong>Note:</strong> ${escapeHtml(ticket.note || '')}</p>
      ${canAdminEdit ? `<button id="save-status-btn">Save status</button>` : ''}
    </div>
    <div class="detail-section">
      <h3>Admin notes</h3>
      <div id="admin-notes-list">${renderAdminNotes(ticket)}</div>
      ${canAdminEdit ? `
      <textarea id="admin-note-input" rows="3" placeholder="Add admin note"></textarea>
      <button id="add-note-btn">Add note</button>
      ` : ''}
    </div>
    <div class="detail-section">
      <h3>Information request</h3>
      <p><strong>Requested:</strong> ${ticket.infoRequested ? 'Yes' : 'No'}</p>
      <p><strong>Last request:</strong> ${escapeHtml(ticket.infoRequestMessage || '')}</p>
      <p><strong>Last reply:</strong> ${escapeHtml(ticket.infoReply || '')}</p>
      ${canAdminEdit ? `
      <textarea id="info-request-input" rows="3" placeholder="Message to ticket owner"></textarea>
      <button id="send-request-btn">Send request by email</button>
      ` : `
      <textarea id="info-reply-input" rows="3" placeholder="Reply to admin (visible to admin)"></textarea>
      <button id="send-reply-btn">Send reply</button>
      `}
    </div>
  `;

  if (canAdminEdit) {
    const statusEdit = document.getElementById('status-edit');
    const groupEdit = document.getElementById('group-edit');
    const saveStatusBtn = document.getElementById('save-status-btn');

    if (statusEdit) {
      statusEdit.value = ticket.status || 'New';
    }
    if (groupEdit) {
      groupEdit.value = ticket.group || 'New request';
    }

    if (saveStatusBtn && statusEdit && groupEdit) {
      saveStatusBtn.addEventListener('click', async () => {
        let newStatus = statusEdit.value;
        let newGroup = groupEdit.value;
        if (newStatus === 'Done') {
          newGroup = 'Completed';
        }
        await fetch(`${API_BASE}/${ticket.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, group: newGroup })
        });
        await loadTickets();
      });
    }

    const addNoteBtn = document.getElementById('add-note-btn');
    const noteInput = document.getElementById('admin-note-input');
    const requestBtn = document.getElementById('send-request-btn');
    const requestInput = document.getElementById('info-request-input');

    if (addNoteBtn) {
      addNoteBtn.addEventListener('click', async () => {
        if (!noteInput.value.trim()) return;
        await fetch(`${API_BASE}/${ticket.id}/admin-notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: noteInput.value })
        });
        await loadTickets();
      });
    }

    if (requestBtn) {
      requestBtn.addEventListener('click', async () => {
        if (!requestInput.value.trim()) return;
        await fetch(`${API_BASE}/${ticket.id}/request-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: requestInput.value })
        });
        await loadTickets();
      });
    }
  } else {
    const replyBtn = document.getElementById('send-reply-btn');
    const replyInput = document.getElementById('info-reply-input');
    if (replyBtn) {
      replyBtn.addEventListener('click', async () => {
        if (!replyInput.value.trim()) return;
        await fetch(`${API_BASE}/${ticket.id}/reply-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply: replyInput.value })
        });
        await loadTickets();
      });
    }
  }
}

function renderAdminNotes(ticket) {
  const notes = ticket.adminNotes || [];
  if (!notes.length) return '<p>No admin notes yet.</p>';
  return '<ul>' + notes.map(n => `<li><strong>${escapeHtml(n.time || '')}:</strong> ${escapeHtml(n.text || '')}</li>`).join('') + '</ul>';
}

setRole(roleSelect.value);
loadTickets();
