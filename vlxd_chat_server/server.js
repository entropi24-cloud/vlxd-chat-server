const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the 'public' folder (so /admin.html is available)
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET','POST']
  }
});

// In-memory chat store
const chats = {};

io.on('connection', (socket) => {
  socket.on('client_message', (payload) => {
    const text = payload?.text || '';
    if (!chats[socket.id]) chats[socket.id] = [];
    chats[socket.id].push({ from: 'client', text, time: Date.now() });

    io.of('/admin').emit('new_message', { clientId: socket.id, text });
  });
});

const adminNs = io.of('/admin');
adminNs.on('connection', (socket) => {
  socket.on('list_clients', () => {
    socket.emit('clients_list', Array.from(io.sockets.sockets.keys()));
  });

  socket.on('admin_message', ({ targetClientId, text }) => {
    const target = io.sockets.sockets.get(targetClientId);
    if (target) target.emit('server_message', { text });
  });
});

app.get('/health', (req,res)=>res.json({ok:true}));

server.listen(3000);
