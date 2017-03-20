var express = require('express'),
    cluster = require('cluster'),
    net = require('net'),
    sio = require('socket.io'),
    sio_redis = require('socket.io-redis');

var port = 3000,
    num_processes = require('os').cpus().length;

console.log("cluster.isMaster = "+cluster.isMaster);
if (cluster.isMaster) {
    console.log("cluster already Master");
    // This stores our workers. We need to keep them to be able to reference
    // them based on source IP address. It's also useful for auto-restart,
    // for example.
    var workers = [];

    // Helper function for spawning worker at index 'i'.
    var spawn = function(i) {
        workers[i] = cluster.fork();

        // Optional: Restart worker on exit
        workers[i].on('exit', function(code, signal) {
            console.log('respawning worker', i);
            spawn(i);
        });
    };

    // Spawn workers.
    for (var i = 0; i < num_processes; i++) {
        spawn(i);
    }

    // Helper function for getting a worker index based on IP address.
    // This is a hot path so it should be really fast. The way it works
    // is by converting the IP address to a number by removing non numeric
  // characters, then compressing it to the number of slots we have.
    //
    // Compared against "real" hashing (from the sticky-session code) and
    // "real" IP number conversion, this function is on par in terms of
    // worker index distribution only much faster.
    var worker_index = function(ip, len) {
        var s = '';
        for (var i = 0, _len = ip.length; i < _len; i++) {
            if (!isNaN(ip[i])) {
                s += ip[i];
            }
        }

        return Number(s) % len;
    };

    // Create the outside facing server listening on our port.
    var server = net.createServer({ pauseOnConnect: true }, function(connection) {
        // We received a connection and need to pass it to the appropriate
        // worker. Get the worker for this connection's source IP and pass
        // it the connection.
        var worker = workers[worker_index(connection.remoteAddress, num_processes)];
        worker.send('sticky-session:connection', connection);
    }).listen(port);
} else {
    console.log("cluster Not Master");
    // Note we don't use a port here because the master listens on it for us.
    var app = new express();

    // Here you might use middleware, attach routes, etc.

    // Don't expose our internal server to the outside.
    var server = app.listen(port),
        io = sio(server);

    // Tell Socket.IO to use the redis adapter. By default, the redis
    // server is assumed to be on localhost:6379. You don't have to
    // specify them explicitly unless you want to change them.
    io.adapter(sio_redis({ host: 'localhost', port: 6379 }));
    // Here you might use Socket.IO middleware for authorization etc.

    io.on('connection',function(socket){
        console.log('--- connection ---');
        console.log('a user connected');

        socket.on('disconnect',function(){
            console.log('--- disconnect ---');
            console.log('a user disconnected');
        });

        socket.on('leave_room',function(userId, chatRoomId){
            console.log('--- leave_room ---');
            console.log('--- userId = ' + userId + ' ---');
            console.log('--- chatRoomId = ' + chatRoomId + ' ---');

            if (!(userId === '') || userId != null || !(chatRoomId === '') || chatRoomId != null){
                socket.leave(chatRoomId);
                socket.to(chatRoomId).emit('leave_room',userId);
            }
        });

        socket.on('join_room', function(userId, chatRoomId){
            console.log('--- join_room ---');
            console.log('--- userId = ' + userId + ' ---');
            console.log('--- chatRoomId = ' + chatRoomId + ' ---');

            if (!(userId === '') || userId != null || !(chatRoomId === '') || chatRoomId != null){
                socket.join(chatRoomId);
                socket.to(chatRoomId).emit('join_room',userId);
            }
        });

        socket.on('is_typing', function(userId, chatRoomId){
            console.log('--- is_typing ---');
            console.log('--- userId = ' + userId + ' ---');
            console.log('--- chatRoomId = ' + chatRoomId + ' ---');

            if (!(userId === '') || userId != null || !(chatRoomId === '') || chatRoomId != null){
                socket.to(chatRoomId).emit('is_typing',userId);
            }
        });

        socket.on('paused', function(userId, chatRoomId){
            console.log('--- paused ---');
            console.log('--- userId = ' + userId + " ---");
            console.log('--- chatRoomId = ' + chatRoomId + " ---");

            if (!(userId === '') || userId != null || !(chatRoomId === '') || chatRoomId != null){
                  socket.to(chatRoomId).emit('paused',userId);
            }
        });
    });

    // Listen to messages sent from the master. Ignore everything else.
    process.on('message', function(message, connection) {
        if (message !== 'sticky-session:connection') {
            return;
        }

        // Emulate a connection event on the server by emitting the
        // event with the connection the master sent us.
        server.emit('connection', connection);

        connection.resume();
    });
}
