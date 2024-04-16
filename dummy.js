const net = require('node:net');
const process = require('node:process');
const {per_line} = require('./per-line.js');

const startup_delay_ms = 2000;

setTimeout(() => {
  const server = net.createServer(sock => {
    sock.write('Echo server\n');
    per_line({stream: sock, callback: line => sock.write('echo line> ' + line)});
  });

  const host = '127.0.0.1';
  const port = 1337;
  server.listen(port, host, () => {
    console.log(`dummy listening on ${host}:${port}`);
  });

  function handle_signal(signal) {
    console.log(`dummy received signal ${signal}.`);
    // Close harder than `server.close(() => process.exit());`
    process.exit();
  }

  process.on('SIGINT', handle_signal);
  process.on('SIGTERM', handle_signal);
}, startup_delay_ms);
