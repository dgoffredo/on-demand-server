const {EventManager} = require('./event-manager.js');

function connect_with_retries({
  // Function used to make connections.  It will be invoked without arguments,
  // and must return an object that is event-compatible with `net.Socket`.
  // Here's a good definition:
  //
  //     () => net.connect(port, host)
  //
  net_connect,
  // Maximum number of connection attempts. Must be an integer greater than or
  // equal to `1`.
  max_attempts,
  // Amount of time, in milliseconds, to wait between each connection attempt.
  // The first connection attempt happens immediately.
  ms_between_attempts,
  // If and when the connection is ready, the socket object will be passed to
  // `on_ready`.  Subsequently, neither `on_ready` nor `on_error` will be
  // invoked.
  on_ready,
  // If and when connection attempts have failed `max_attempts` times, an array
  // of errors will be passed to `on_error`.  Subsequently, neither `on_ready`
  // nor `on_error` will be invoked.
  on_error,
}) {
  let attempts = 0;
  let errors = [];
  // `sock` is the socket most recently returned by `net_connect`.
  let sock;
  // `sock_events` is a wrapper around `sock`'s event registration, so we can
  // remove our event listeners before sending the socket to the caller.
  let sock_events;

  function connect() {
    attempts += 1;
    sock = net_connect();
    sock_events = EventManager(sock);

    sock_events.on('error', error => {
      errors.push(error);
    });

    sock_events.on('close', () => {
      if (attempts >= max_attempts) {
        on_error(errors);
        return;
      }
      setTimeout(connect, ms_between_attempts);
    });

    sock_events.on('ready', () => {
      sock_events.clear();
      on_ready(sock);
    });
  }

  connect();
}

// Example usage:
function example({port, host}) {
  const net = require('node:net');

  connect_with_retries({
    net_connect: () => net.connect(port, host),
    max_attempts: 3,
    ms_between_attempts: 500,
    on_ready: sock => console.log('we did it: ', sock),
    on_error: errors => console.log('we failed: ', errors)
  })
}

exports.connect_with_retries = connect_with_retries;
exports.example = example;
