'use strict';



var socket = io.connect();

var roomname;

function MakeRoom(){
  roomname = document.getElementById("roomname").value;
  console.log('Attempted to create room', roomname);
  socket.emit('make a room', roomname);
  
}

function EntryRoom(room){
  socket.emit('join', room);
  console.log('Attempted to join room', room);
  window.location.href = '/main.html?roomname=' + room;
}

socket.on('create', function(rooms) {
  //console.log('Created room ' + room);

  var RoomList = document.getElementById("roomList");
  RoomList.innerHTML = "";

  rooms.forEach(room => {
    var newP = document.createElement("p");
    var RoomText = document.createTextNode(room.meeting_name);
    newP.appendChild(RoomText);

    var EntryBtn = document.createElement("button");
    var EntryText = document.createTextNode("방입장");
    EntryBtn.setAttribute("class", "entry");
    EntryBtn.appendChild(EntryText);
	
    newP.appendChild(EntryBtn);
    var NumText = document.createTextNode(room.meeting_num);
    
    RoomList.insertBefore(newP,RoomList.childNodes[0]);
    newP.appendChild(NumText); 
  });

  var EntryRoomname;
  var EntryRoomnum;
  var entryBtn = document.getElementsByClassName("entry");
  for (var i=0; i<entryBtn.length; i++) { 
    entryBtn[i].addEventListener("click", function() {  
      EntryRoomname = this.previousSibling.nodeValue;
      EntryRoomnum = this.nextSibling.nodeValue;
      if(EntryRoomnum < 2){
        EntryRoom(EntryRoomname);
      }
      else {
        alert("입장 가능 인원이 초과되어 입장이 불가능합니다");
      }

    });
  }
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
});

///////////////////////////////////////////////



////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}


////////////////////////////////////////////////////

window.onbeforeunload = function() {
  sendMessage('bye');
};
