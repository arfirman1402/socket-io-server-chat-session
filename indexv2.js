var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

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

    socket.on('join_room', function(userId, chatRoomId, socketId){
        console.log('--- join_room ---');
        console.log('--- userId = ' + userId + ' ---');
        console.log('--- chatRoomId = ' + chatRoomId + ' ---');
        console.log('--- socketId = ' + socketId + ' ---');

        if (!(userId === '') || userId != null || !(chatRoomId === '') || chatRoomId != null || !(socketId === '') || socketId != null){
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

http.listen(3000, function(){
    console.log('listening on *:3000');
});
