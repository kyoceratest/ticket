const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const DATA_DIR = path.join(__dirname, '..', 'data');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');

let tickets = [];
let nextId = 1;

function loadTickets() {
  try {
    if (fs.existsSync(TICKETS_FILE)) {
      const raw = fs.readFileSync(TICKETS_FILE, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      tickets = Array.isArray(parsed) ? parsed : [];
      nextId = tickets.reduce((max, t) => Math.max(max, t.id || 0), 0) + 1;
    }
  } catch (err) {
    console.error('Failed to load tickets.json', err);
    tickets = [];
    nextId = 1;
  }
}

function saveTickets() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save tickets.json', err);
  }
}

loadTickets();

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('SMTP not fully configured. Emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

const mailTransport = createTransport();

function sendMail(options) {
  if (!mailTransport) {
    console.warn('Mail transport not configured, skipping email send.');
    return Promise.resolve();
  }
  return mailTransport.sendMail(options).catch(err => {
    console.error('Error sending email', err);
  });
}

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/tickets', (req, res) => {
  res.json(tickets);
});

app.post('/api/tickets', (req, res) => {
  const { itemName, status, owner, dueDate, priority, note, group, ownerEmail } = req.body;
  const ticket = {
    id: nextId++,
    itemName,
    status,
    owner,
    ownerEmail: ownerEmail || '',
    dueDate,
    priority,
    note,
    group: group || 'Default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    adminNotes: [],
    infoRequested: false,
    infoRequestMessage: '',
    infoRequestSentAt: null,
    infoReply: '',
    infoReplyAt: null
  };
  tickets.push(ticket);
  saveTickets();
  res.status(201).json(ticket);
});

app.put('/api/tickets/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = tickets.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  tickets[index] = { ...tickets[index], ...req.body, updatedAt: new Date().toISOString() };
  saveTickets();
  res.json(tickets[index]);
});

app.delete('/api/tickets/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = tickets.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  tickets.splice(index, 1);
  saveTickets();
  res.status(204).end();
});

app.post('/api/tickets/:id/admin-notes', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  const { text } = req.body;
  if (!ticket.adminNotes) ticket.adminNotes = [];
  ticket.adminNotes.push({
    time: new Date().toISOString(),
    text: text || ''
  });
  ticket.updatedAt = new Date().toISOString();
  saveTickets();
  res.json(ticket);
});

app.post('/api/tickets/:id/request-info', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { message } = req.body;
  ticket.infoRequested = true;
  ticket.infoRequestMessage = message || '';
  ticket.infoRequestSentAt = new Date().toISOString();
   ticket.updatedAt = new Date().toISOString();
  saveTickets();

  const to = ticket.ownerEmail;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
  if (to) {
    await sendMail({
      from,
      to,
      subject: `Information request for ticket: ${ticket.itemName || ''}`,
      text: `An information request was created for ticket "${ticket.itemName || ''}".\n\nMessage from admin:\n${message || ''}`
    });
  }

  res.json(ticket);
});

app.post('/api/tickets/:id/reply-info', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { reply } = req.body;
  ticket.infoReply = reply || '';
  ticket.infoReplyAt = new Date().toISOString();
  ticket.infoRequested = false;
  ticket.updatedAt = new Date().toISOString();
  saveTickets();

  const adminEmail = process.env.ADMIN_EMAIL;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
  if (adminEmail) {
    await sendMail({
      from,
      to: adminEmail,
      subject: `Reply to information request for ticket: ${ticket.itemName || ''}`,
      text: `The ticket owner replied to the information request for ticket "${ticket.itemName || ''}":\n\n${reply || ''}`
    });
  }

  res.json(ticket);
});

app.listen(PORT, () => {
  console.log(`Task ticket app listening on http://localhost:${PORT}`);
});
