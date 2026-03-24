const args = process.argv.slice(2);

if (args.includes('--cli')) {
  const { startCLI } = require('./cli');
  startCLI();
} else if (args.includes('--server')) {
  const express = require('express');
  const cors = require('cors');
  const http = require('http');
  const { Server } = require('socket.io');
  const routes = require('./routes');
  const { setEmit } = require('./logger');
  const { SERVER_PORT } = require('./constants');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', routes);

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  setEmit((stateSnapshot) => {
    io.emit('state:update', stateSnapshot);
  });

  const PORT = process.env.PORT || SERVER_PORT;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} else {
  console.log('Usage: node src/index.js [--cli | --server]');
  process.exit(1);
}
