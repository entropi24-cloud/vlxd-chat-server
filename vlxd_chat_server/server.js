const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

const chats = {};

io.on('connection', (socket) => {
  socket.on('client_message', (payload) => {
    const text = payload.text || '';
    if (!chats[socket.id]) chats[socket.id] = [];
    chats[socket.id].push({ from: 'client', text, time: Date.now() });
    io.of('/admin').emit('new_message', { clientId: socket.id, text });
  });
});

const adminNs = io.of('/admin');
adminNs.on('connection', (socket) => {
  socket.on('list_clients', () => {
    const clients = Array.from(io.sockets.sockets.keys());
    socket.emit('clients_list', clients);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));