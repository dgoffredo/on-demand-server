// TODO: document

const net = require('node:net');
const process = require('node:process');
const {Backend} = require('./backend.js');
const parse_command_line = require('./command-line.js').parse;

let options;
try {
  options = parse_command_line(process.argv);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const backend = Backend({
  command: options.command,
  host: options.backend_host,
  port: options.backend_port,
  ms_to_linger: 5000,  // TODO: make configurable
  max_connection_attempts: 6,  // TODO: make configurable
  ms_between_connection_attempts: 500  // TODO: make configurable
});

const server = net.createServer(client => {
  console.log('Received connection.');
  backend.connect({
    on_error: errors => {
      client.end();
      console.error('unable to connect to backend: ', errors);
    },
    on_ready: server => {
      server.pipe(client);
      client.pipe(server);
      client.on('close', () => server.destroy());
    }
  });
});

server.listen(options.listen_port, options.listen_host, () => {
  console.log(`main listening on ${options.listen_host}:${options.listen_port}`);
});

server.on('close', () => process.exit());

function handle_signal(signal) {
  console.log(`main received signal ${signal}.`);
  backend.terminate();
  server.close();
}

process.on('SIGINT', handle_signal);
process.on('SIGTERM', handle_signal);
