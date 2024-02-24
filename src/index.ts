require('dotenv').config();
import {createServer} from 'http';
import {Server} from 'socket.io';
import {ClientToServerEvents, ServerToClientEvents} from './types/LocalTypes';

import promisePool from './lib/db';
import {MediaItem} from '@sharedTypes/DBTypes';
import {RowDataPacket} from 'mysql2';

// socket.io test
const httpServer = createServer().listen(process.env.SOCKET_PORT || 3004);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
  },
});

let lastRowCount = 0;

setInterval(async () => {
  const [rows] = await promisePool.execute<MediaItem[] & RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM MediaItems',
  );
  const currentRowCount = rows[0].count;
  console.log('interval', currentRowCount, lastRowCount);
  if (currentRowCount !== lastRowCount) {
    io.emit('addMedia', 'media added or deleted'); // Emit to all connected sockets
    lastRowCount = currentRowCount;
  }
}, 5000); // Poll every 5 seconds

io.on('connection', (socket) => {
  console.log(`${socket.id} user just connected`);
  socket.on('disconnect', () => {
    console.log('user just disconnected');
  });
});

io.engine.on('connection_error', (err) => {
  console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
});
