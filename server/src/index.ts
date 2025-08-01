import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RollRequest, RollResult, JoinRoomRequest } from '../../shared/src/types';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data: JoinRoomRequest) => {
    socket.join(data.roomId);
    socket.to(data.roomId).emit('player-joined', { 
      player: data.playerName,
      socketId: socket.id 
    });
    console.log(`${data.playerName} joined room: ${data.roomId}`);
  });

  socket.on('roll-dice', (rollRequest: RollRequest) => {
    // For now, generate random results server-side for fairness
    const rolls = rollRequest.dice.map(diceType => {
      const sides = parseInt(diceType.substring(1));
      const result = Math.floor(Math.random() * sides) + 1;
      return { type: diceType, result };
    });

    const rollResult: RollResult = {
      player: rollRequest.player,
      rolls,
      modifier: rollRequest.modifier || 0,
      total: rolls.reduce((sum, roll) => sum + roll.result, 0) + (rollRequest.modifier || 0),
      timestamp: Date.now()
    };

    // Broadcast to all clients in the room
    io.emit('roll-result', rollResult);
    console.log('Roll result:', rollResult);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
