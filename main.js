// TODO: document

const net = require('node:net');
const process = require('node:process');
const {Backend} = require('./backend.js');

const backend = Backend({
  command: ['node', 'dummy.js'],
  host: '127.0.0.1',
  port: 1337,
  ms_to_linger: 5000
});

const server = net.createServer(client => {
	console.log('Received connection.');
  backend.connect({
    on_error: errors => {
      client.end();
      console.error('oh noes! ', errors);
    },
    on_ready: server => {
      server.pipe(client);
      client.pipe(server);
    }
  });
});

const host = '127.0.0.1';
const port = 1338;
server.listen(port, host, () => {
  console.log(`main listening on ${host}:${port}`);
});

server.on('close', () => process.exit());

function handle_signal(signal) {
  console.log(`main received signal ${signal}.`);
  backend.terminate();
  server.close();
}

process.on('SIGINT', handle_signal);
process.on('SIGTERM', handle_signal);
