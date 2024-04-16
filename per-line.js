// Emit events per line of input from a `stream.Readable`.
//
// The line separator is the '\n' character.
//
// `readable_stream` is expected to yield `Buffer` instances when read.
// Specifically, `readable_stream.on('data', callback)` must pass `Buffer`
// instances to `callback`.
//
// Example usage:
//
//     per_line(readable_stream, line => {
//         process.stdout.write('received line: ' + line.toString());
//     });
//
// The argument to the callback is a Buffer that contains the line separator
// unless it's the last line.
//
// `per_line` returns `readable_stream`.
function per_line({stream, callback}) {
  let chunks = [];

  stream.on('data', chunk => {
    for (let begin = 0, separator; begin !== chunk.length; begin = separator + 1) {
      separator = chunk.indexOf('\n', begin);
      if (separator === -1) {
        chunks.push(chunk.subarray(begin));
        return;
      }

      // We have a line with suffix: chunk.subarray(begin, separator + 1)
      let line;
      if (chunks.length !== 0) {
        chunks.push(chunk.subarray(begin, separator + 1));
        line = Buffer.concat(chunks);
        chunks.length = 0;
      } else {
        line = chunk.subarray(begin, separator + 1);
      }

      callback(line);
    }
  });

  stream.on('end', () => {
    if (chunks.length === 0) {
      return;
    }
    callback(Buffer.concat(chunks));
    chunks.length = 0;
  });
}

// Example usage:
function example(file_path) {
  const fs = require('node:fs');
  const process = require('node:process');

  per_line({
    stream: fs.createReadStream(file_path),
    callback: line => process.stdout.write('line: ' + line.toString())
  });
}

exports.per_line = per_line;
exports.example = example;
