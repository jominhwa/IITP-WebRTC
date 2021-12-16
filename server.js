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
  key: fs.readFileSync(__dirname + '/../private.pem'),
  cert: fs.readFileSync(__dirname + '/../public.pem') 
};
/*
const options = {
  key: fs.readFileSync('./../../../../etc/letsencrypt/live/본인 도메인 주소/privkey.pem'),
  cert: fs.readFileSync('./../../../../etc/letsencrypt/live/본인 도메인 주소/cert.pem')
};
*/

//app.use(static(path.join(__dirname, 'public')));


app.use('/', express.static(__dirname + "/"));
app.use('/css', express.static(__dirname + "/css"));

////////////////////////////////////////////////////////////////////

app.get('/', function(req, res){
   fs.readFile('login.html',function(error,data){
                  res.writeHead(200,{'Content-type' : 'text/html'});
                  res.end(data);
      });
});

app.get('/home.html', function(req, res){
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
var username;

var isHangup = false;
var HangUp_user;

const Rooms = [];
const RoomNumClient = [];

function RoomList(data) {
  const meeting_info = {
    meeting_master : data.username,
    meeting_name : data.roomname,
    meeting_num :  RoomNumClient[data.roomname],
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
  
  socket.on('set username', function(user){
    username = user;
  });
  

  socket.on('get username', function(){
    if(isHangup === false){
      socket.username = username;
      socket.emit('get username', username);
    }
    else {
      socket.username = HangUp_user;
      socket.emit('get username', HangUp_user);
      isHangup = false;
      socket.emit('create', Rooms);
    }
  });

  socket.on('delete room', function(room){
    if(RoomNumClient[room] == 0) {
      const index = Rooms.findIndex(obj => obj.meeting_name == room);
      Rooms.pop(Rooms[index]);
      io.sockets.emit('create', Rooms);
    }
    else {
      socket.emit("delete_error");
    }
  });

  socket.on('make a room', function(room){
    const index = Rooms.findIndex(obj => obj.meeting_name == room.roomname);
    if(index === -1){
      RoomNumClient[room.roomname] = 0;
      io.sockets.emit('create', RoomList(room));
    }
    else{ 
      socket.emit('already exist');
    }
  });

  socket.on('hang up', function(data){
    isHangup = true;
    roomname = data.roomname; 
    HangUp_user = data.username;
    RoomNumClient[roomname] -= 1;
    const index = Rooms.findIndex(obj => obj.meeting_name == roomname);
    Rooms[index].meeting_num = RoomNumClient[roomname];

    io.sockets.emit('create', Rooms);

    socket.broadcast.to(roomname).emit('remote hang up');

  });
  
 
  socket.on('message', function(message) {
    log('Client said: ', message);
    socket.broadcast.emit('message', message);
  });

  socket.on('join', function(room) {
    log('Received request to create or join room ' + room);
    roomname = room; 
    username = socket.username;

    RoomNumClient[roomname] += 1;
    const index = Rooms.findIndex(obj => obj.meeting_name == roomname);
    Rooms[index].meeting_num = RoomNumClient[roomname];

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    io.sockets.emit('create', Rooms);

    if (numClients === 0) {
      log('Client ID ' + socket.id + ' created room ' + room);
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
    socket.username = username;
  
    socket.emit('roominfo', {roomname, username});
    if (numClients === 0) {
      socket.emit('room_state', 'created');
    }
    if (numClients === 1) {
      io.sockets.in(roomname).emit('room_state', 'join');
      socket.emit('room_state', 'joined');
      socket.broadcast.to(roomname).emit('get remotename', username);
    }
   
  });
  
  socket.on('notice username', function(data){
    socket.broadcast.to(data.roomname).emit('get remotename', data.username);
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
  socket.on('socket Data', function(user){
     username = user;
	  console.log(username);
  });
  socket.on('bye', function(){
    console.log('received bye');
  });

});

