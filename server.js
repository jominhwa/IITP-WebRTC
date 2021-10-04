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
   fs.readFile('main.html',function(error,data){
                  res.writeHead(200,{'Content-type' : 'text/html'});
                  res.end(data);
      });
});

var fileServer = new(nodeStatic.Server)();

var server = https.createServer(options, app).listen(3000);
var io = require('socket.io')(server);

io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function(room) {
    log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      socket.emit('full', room);
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