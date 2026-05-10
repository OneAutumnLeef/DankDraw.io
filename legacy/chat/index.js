const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// connect
io.on('connection', (socket) => {
  console.log('a user connected');

  // listen for user's name
  socket.on('sendName', (name) => {
    socket.username = name; // store the user's name in the socket object
  });

  // listen for chat messages
  socket.on('chat message', (data) => {
    console.log(`${socket.username} said: ${data.message}`);
    io.emit('chat message', { name: socket.username, message: data.message });
  });

  // disconnect
  socket.on('disconnect', () => {
    console.log(`${socket.username} disconnected`);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
