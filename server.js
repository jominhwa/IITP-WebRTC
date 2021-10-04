'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');
const  https = require('https');
var path = require('path');
const  fs = require('fs');
var express = require('express');


var app = express();

const options = {
  key: fs.readFileSync('./../../../../etc/letsencrypt/live/pingppung.xyz/privkey.pem'),
  cert: fs.readFileSync('./../../../../etc/letsencrypt/live/pingppung.xyz/cert.pem')
//  key: fs.readFileSync('./../../../../etc/letsencrypt/live/vladek.xyz/privkey.pem'),
//  cert: fs.readFileSync('./../../../../etc/letsencrypt/live/vladek.xyz/cert.pem')

};

//app.use(static(path.join(__dirname, 'public')));


app.use('/', express.static(__dirname + "/"));
app.use('/css', express.static(__dirname + "/css"));

////////////////////////////////////////////////////////////////////

app.get('/', function(req, res){
   fs.readFile('home.html',function(error,data){
                  res.writeHead(200,{'Content-type' : 'text/html'});
                  res.end(data);
      });
});

app.get('/main.html?:roomname', function(req, res){
	fs.readFile('main.html',function(error,data){
                  res.writeHead(200,{'Content-type' : 'text/html'});
                  res.end(data);
      });
});

var fileServer = new(nodeStatic.Server)();

var server = https.createServer(options, app).listen(3000);
var io = require('socket.io')(server);


//변수

var roomname;

const Rooms = [];
function RoomList(data) {
  const meeting_info = {
    meeting_name : data,
  }
  Rooms.push(meeting_info);
  return Rooms;
}



io.sockets.on('connection', function(socket) {
  socket.emit('create', Rooms);
  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }
  
  socket.on('make a room', function(room){
    io.sockets.emit('create', RoomList(room));
  });
  
  socket.on('message', function(message) {
    log('Client said: ', message);
    socket.broadcast.emit('message', message);
  });

  socket.on('join', function(room) {
    log('Received request to create or join room ' + room);
    roomname = room;
    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      socket.emit('full', room);
    }
  });
  
  socket.on('roominfo', function(){
    var clientsInRoom = io.sockets.adapter.rooms[roomname];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    socket.join(roomname);
    socket.emit('roominfo', roomname);
    if (numClients === 0) {
      socket.emit('room_state', 'created');
    }
    if (numClients === 1) {
      io.sockets.in(roomname).emit('room_state', 'join');
      socket.emit('room_state', 'joined');
    }
   
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});
