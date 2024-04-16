// TODO: document

const child_process = require('node:child_process');
const net = require('node:net');
const process = require('node:process');
const {connect_with_retries} = require('./connect-with-retries.js');
const {EventManager} = require('./event-manager.js');
const {per_line} = require('./per-line.js');

// The plan:
//
// backend.connect() -> socket
//
//     Keeps track of how many such sockets can still be written to and/or read
//     from.  Whenever there are such sockets, then the function manages a
//     a child process ("the backend") to which connections are forwarded.
//
//     When there are no longer any such sockets, then the backend is
//     terminated.  If another connection comes in, then a new backend is
//     spawned.
//
// Then, this process is a stream (TCP) server that calls connect_to_backend()
// for each client and connects the read and write ends with ".pipe(...)".
//
// When the stream server shuts down, the backend is first terminated via a
// call to "backend.terminate()".
function Backend({
  // The program to invoke and its command line arguments, together as one
  // array of strings.  For example:
  //
  //     ['/usr/bin/thing', 'this-is-argv1', '--this-is-argv2']
  //
  // The first element of the array is both the path to the program and the
  // value of `argv[0]` passed to the program.
  command,
  // The host on which `command` listens.  This must be a local address, but
  // isn't necessarily '127.0.0.1'.
  host = '127.0.0.1',
  // The port on which `command` listens.
  port,
  // Amount of time, in milliseconds, to allow the child process to survive
  // without clients.
  ms_to_linger = 0
}) {
  let child;
  // true: `child` is a child process, but it hasn't started yet.
  // false: Either `child` isn't a child process, or it started already.
  let spawning = false;

  // TODO: document
  const {increment, decrement} = (() => {
    let num_open_connections = 0;
    // TODO: document
    let kill_timer;

    function clear_kill_timer() {
      if (kill_timer !== undefined) {
        clearTimeout(kill_timer);
        kill_timer = undefined;
      }
    }

    function increment() {
      ++num_open_connections;
      clear_kill_timer();
    }

    function decrement() {
      --num_open_connections;
      if (num_open_connections !== 0) {
        return;
      }
      // No more clients.  Terminate the child process, after a grace period.
      clear_kill_timer();
      killTimer = setTimeout(() => {
        if (num_open_connections === 0) {
          terminate();
        }
        clear_kill_timer();
      }, ms_to_linger);
    }

    return {increment, decrement};
  })();

  // `on_error` accepts an array of errors (whatever an error might be).
  // `on_ready` accepts the socket returned by `net_connect`.
  function connect({on_error, on_ready}) {
    increment();
  
    if (child === undefined) {
      // Create the "backend" child process.
      child = child_process.spawn(command[0], command.slice(1));
      spawning = true;
      child.on('spawn', () => {
        per_line({
          stream: child.stdout,
          callback: line => process.stdout.write('backend stdout> ' + line.toString())
        });
        per_line({
          stream: child.stderr,
          callback: line => process.stderr.write('backend stderr> ' + line.toString())
        });
      });
    }

    if (spawning) {
      child.on('spawn', () => {
        spawning = false;
        // We don't know when the child process is ready to accept connections,
        // so we immediately try to connect, but allow for some retries.
        connect_with_retries({
          net_connect: () => net.connect(port, host),
          max_attempts: 6,
          ms_between_attempts: 500,
          on_error: errors => {
            decrement();
            on_error(errors);
          },
          on_ready: sock => {
            sock.on('close', decrement);
            on_ready(sock);
          }
        });
      });

      return;
    }

    // The "backend" child process is already running, so connect to it without
    // retries.
    const sock = net.connect(port, host);
    const events = EventManager(sock);

    events.on('ready', () => {
      events.clear();
      sock.on('close', decrement);
      on_ready(sock);
    });

    events.on('error', error => {
      events.clear();
      decrement();
      on_error([error]);
    });
  }

  function terminate() {
    if (child !== undefined) {
      child.kill();
      child = undefined;
    }
  }

  return {connect, terminate};
}

exports.Backend = Backend;
