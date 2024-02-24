require('dotenv').config();
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import {createServer} from 'http';
import {Server} from 'socket.io';

import * as middlewares from './middlewares';
import {MessageResponse} from '@sharedTypes/MessageTypes';
import {ClientToServerEvents, ServerToClientEvents} from './types/LocalTypes';
import promisePool from './lib/db';
import {MediaItem} from '@sharedTypes/DBTypes';
import {RowDataPacket} from 'mysql2';

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

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

app.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'socket server is running',
  });
});

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default httpServer;
