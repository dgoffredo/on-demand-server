A Lazy Reverse Proxy
====================
I want vlc to stream video from a webcam onto the internet.

This works, but the problem is that the vlc instance is running all of the
time, taking up CPU even when nobody is connected to the stream.

If only vlc would stop processing video where there are no clients.

Here's an idea: shut down vlc when there are no clients, and start it again
when somebody connects.  Concurrent connections can share the same vlc instance.

```console
$ ./on-demand-server :8000 :8080 -- cvlc -v v4l2:///dev/video2 --sout '#transcode{vcodec=theo,fps=4}:standard{access=http,mux=ogg,dst=:8080}'
```

- `./on-demand-server` is the server that will act as a reverse proxy to vlc,
  managing the vlc instance (child process) as needed.
- `:8000` is the interface on which `on-demand-server` will listen.  That's
  port 8000, and since the host was omitted it defaults to `0.0.0.0` ("all
  interfaces").
- `:8080` is the interface to which `on-demand-server` will connect to contact
  the vlc child process.  That's port 8080, and since the host was omitted it
  defaults to `127.0.0.1`.
- `--` separates the `on-demand-server` options from the child process command
  invocation.
- `cvlc` `-v` ... is the command the `on-demand-server` will run to spawn the
  vlc server.

Example
-------
[dummy.js](dummy.js) is an example echo server that you can use to play with
`on-demand-server`.  It listens on port 1337.

In one shell,
```console
$ ./on-demand-server localhost:8000 :1337 -- node dummy.js
main listening on localhost:8000
```

Then, in another shell:
```console
$ telnet localhost 8000
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
```

After a moment, you'll see this is the first shell:
```console
Received connection.
num_open_connections incremented to 1
backend stdout> dummy listening on 127.0.0.1:1337
```

and then you can interact with the dummy in the second shell:
```console
Echo server
hello
echo line> hello
it works
echo line> it works
^]
telnet> Connection closed.
```

The disconnect will decrement the child process's connection count.  Now being
zero, the child process is terminated after a few seconds.
```console
num_open_connections decremented to 0
backend stdout> dummy received signal SIGTERM.
```

If you connect again, a new `dummy.js` child process will be spawned.
