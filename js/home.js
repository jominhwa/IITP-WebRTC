'use strict';

var socket = io.connect();

var room;

function MakeRoom(){
  room = document.getElementById("roomname").value;
  socket.emit('make a room', room);	
  if (room !== '') {
    socket.emit('create or join', room);
    console.log('Attempted to create or  join room', room);
  }	
}
socket.on('created', function(room) {
  console.log('Created room ' + room);
  window.location.href = '/main.html?roomname=' + room;
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
});

socket.on('joined', function(room) {
  console.log('joined: ' + room);
  window.location.href = '/main.html?roomname=' + room;
});


////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}


////////////////////////////////////////////////////

window.onbeforeunload = function() {
  sendMessage('bye');
};

