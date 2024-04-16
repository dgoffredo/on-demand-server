// TODO: document

function parse_address(address) {
  let match = address.match(/^(.*):([0-9]+)$/);
  if (match === null) {
    throw Error(`Address must have the form host:port, but received: ${address}`);
  }
  let [ , host, port] = match;

  // Clean up IPv6.
  match = host.match(/^\[(.*)\]$/);
  if (match !== null) {
    [ , host] = match;
  }

  port = Number(port);
  return {host, port};
}

function parse(argv) {
  // argv: [<node>, <script>, <listen>, <backend>, '--', <command> ...]
  const [ ,  , ...args] = argv;

  // TODO: --help -h

  // args: [<listen>, <backend>, '--', <command> ...]
  const expected = '<listen address> <backend address> -- <command> ...';
  if (args.length < 4) {
    throw Error('Not enough command line arguments.\n' +
      `Expected: ${expected}\n` +
      `Received: ${args.map(arg => JSON.stringify(arg)).join(' ')}`);
  }

  if (args[2] !== '--') {
    throw Error('Backend command must be preceded by "--".\n' +
      `Expected: ${expected}\n` +
      `Received: ${args.map(arg => JSON.stringify(arg)).join(' ')}`);
  }

  let [listen, backend, , ...command] = args;

  listen = parse_address(listen);
  listen.host = listen.host || '0.0.0.0';
  backend = parse_address(backend);
  backend.host = backend.host || '127.0.0.1';

  return {
    listen_host: listen.host,
    listen_port: listen.port,
    backend_host: backend.host,
    backend_port: backend.port,
    command
  };
}

exports.parse = parse;
