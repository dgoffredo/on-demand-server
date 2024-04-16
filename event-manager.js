// `EventManager` wraps the `.on` and `.removeListener` methods of
// an `event_emitter`.
//
// `EventManager(event_emitter).on` forwards to `event_emitter`, but also
// remembers the arguments.
//
// `EventManager(event_emitter).clear()` calls `event_emitter.removeListener`
// for every previous invocation of `.on`.
function EventManager(event_emitter) {
  const listeners = [];

  function on(event, callback) {
    listeners.push({event, callback});
    event_emitter.on(event, callback);
  }

  function clear() {
    for (const {event, callback} of listeners) {
      event_emitter.removeListener(event, callback);
    }
    listeners.length = 0;
  }

  return {on, clear};
}

exports.EventManager = EventManager;
