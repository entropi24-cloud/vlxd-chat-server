const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET','POST']
  }
});

const chats = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('client_message', (payload) => {
    const text = payload.text || '';
    if (!chats[socket.id]) chats[socket.id] = [];
    chats[socket.id].push({ from: 'client', text, time: Date.now() });
    io.of('/admin').emit('new_message', { clientId: socket.id, text });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('get_history', () => {
    socket.emit('history', { clientId: socket.id, history: chats[socket.id] || [] });
  });
});

const adminNs = io.of('/admin');

adminNs.on('connection', (socket) => {
  console.log('Admin connected:', socket.id);

  socket.on('list_clients', () => {
    const clients = Array.from(io.sockets.sockets.keys());
    socket.emit('clients_list', clients);
  });

  socket.on('get_history', (clientId) => {
    socket.emit('history', { clientId, history: chats[clientId] || [] });
  });

  socket.on('admin_message', ({ targetClientId, text }) => {
    const target = io.sockets.sockets.get(targetClientId);
    if (target) {
      target.emit('server_message', { text });
      if (!chats[targetClientId]) chats[targetClientId] = [];
      chats[targetClientId].push({ from: 'admin', text, time: Date.now() });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));
