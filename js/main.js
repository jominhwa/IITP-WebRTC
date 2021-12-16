
'use strict';

var isChannelReady = false;
var isInitiator = false; //Initiator 창시자 => 방 회장?
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;


//RTC 중계가 끊어질 것을 대비하여 임시 서버 작성
//stun 서버(P2P 통신을 위해 NAT를 탐색하는 과정)
var pcConfig = {
  'iceServers': [
     { 'urls': 'stun:stun.l.google.com:19302' },
     { 'urls': 'turn:본인 도메인 주소', 'username': '유저이름', 'credential': '비밀번호'}
  ]
};

// 어떤 장치가 있는지에 관계없이 오디오 및 비디오를 설정
// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////


//소켓 연결
var socket = io.connect();

var roomname;
var numClient;
var username;

socket.emit('roominfo', 'What is the room name?');
socket.on('roominfo', function(room){
  roomname = room.roomname;
  username = room.entry_user;
  document.getElementById("localName").innerHTML = username;
  if (roomname !== '') {
    // 클라이언트(접속자)에게 create or join 이벤트명으로 room 정보 전달
    socket.emit('create or join', roomname);
    console.log('Attempted to create or  join room', roomname);
  }	
  document.getElementById("room").innerHTML = "This is "+ roomname;
  document.getElementById("user").innerHTML = "Your name is " +username;

});




// 클라이언트으로부터 created 이벤트를 받았을 때 처리
socket.on('created', function(room) {
  console.log('Created room ' + room);
  //방 창시자가 생겼다는 뜻으로 true를 저장
  isInitiator = true;
});

socket.on('Num of Client', function(num){
 // numClient=Number(numClients) +1;
  numClient = num;
  document.getElementById("num").innerHTML = numClient + " Person";
});



// 클라이언트으로부터 full 이벤트를 받았을 때 처리
socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});
// 클라이언트으로부터 join 이벤트를 받았을 때 처리
socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  //화상통화 준비 완료라는 뜻?
  isChannelReady = true;
});
// 클라이언트으로부터 joined 이벤트를 받았을 때 처리
socket.on('joined', function(room) {
  console.log('joined: ' + room);
  //화상통화 준비 완료라는 뜻?
  isChannelReady = true;
});
// 클라이언트으로부터 log 이벤트를 받았을 때 처리
socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////
function backhomeBtn(){
  socket.emit('Decrease Client', {roomname, numClient, username}); 
  location.href="/home.html";
}
//message 보내는 함수
function sendMessage(message) {
  console.log('Client sending message: ', message);   
  // 클라이언트(접속자)에게 message 이벤트명으로 message 전달
  socket.emit('message', message);
}

// 서로 message를 주고 받으면서 연결 확립하는 부분
// This client receives a message
socket.on('message', function(message) {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    //원격(두번째 접속자) 설명 변경 => 두 peer의 연결 구성 설명
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
      handleRemoteHangup();
  } //else if (message === 'bye'){
  //   socket.emit('Decrease Client',{roomname, numClient});
//  }
});
socket.on('Decrease Client',function(num){
  document.getElementById("num").innerHTML = num + " Person";
  remoteStream = null;
  remoteVideo.srcObject = null;
  document.getElementById("localName").innerHTML = null;
  pc = null;
  isStarted = false;

});

socket.on('send roomname', function(room){
  roomname = room;
  console.log(roomname);
});
socket.on('SendName', function(name){
//	var name = name.entry_user;
//	var hostname = name.hostname;
	if(username !=  name){
		document.getElementById("remoteName").innerHTML = name;
//		document.getElementById("localName").innerHTML = hostname;
	
	}
});
////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');



navigator.mediaDevices.getUserMedia({
	audio: true,
        video: true
})
.then(gotStream)
.catch(function(e) {
	alert('getUserMedia() error: ' + e.name);
});

function cameraBTN(){
	var text = document.getElementById("cameraButton").innerHTML;
	if(text == "카메라켜기"){
		document.getElementById("cameraButton").innerHTML = "카메라끄기";
	}
	else if(text == "카메라끄기"){ 
		document.getElementById("cameraButton").innerHTML = "카메라켜기";	
	}
	localStream.getVideoTracks()[0].enabled = !(localStream.getVideoTracks()[0].enabled);
}

function audioBTN(){
        var text = document.getElementById("audioButton").innerHTML;
        if(text == "마이크켜기"){
                document.getElementById("audioButton").innerHTML = "마이크끄기";
        }
        else if(text == "마이크끄기"){
                document.getElementById("audioButton").innerHTML = "마이크켜기";
        }
        localStream.getAudioTracks()[0].enabled = !(localStream.getAudioTracks()[0].enabled);
}

//전달받은 stream을  localVideo에 저장
function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
  //isInitiator이 true이면 maybeStart 함수 호출
  if (isInitiator) {
    maybeStart();
  }
}

var constraints = {
  audio: true,
  video: true
};

console.log('Getting user media with constraints', constraints);

if (location.hostname !== 'localhost') {
  requestTurn(
      'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  //if(true){}일때 if문 실행
  //isStarted가 false일때(!isStarted는 반대이므로 true) && localStream의 자료형이 undefined이 아닐때 && isChannelReady가 true일 때 if문 실행
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    //createPeerConnection()으로 peerConnection 생성
    createPeerConnection();
    //로컬 peerconnection에 localStream을 추가
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
	doCall();
    }
  }
}

window.onbeforeunload = function() {
	//console.log("error!");
          sendMessage('bye');
};

/////////////////////////////////////////////////////////
//PeerConnection 생성함수
function createPeerConnection() {
  try { 
    //RTCPeerConnection 객체 생성하여 pc 저장
    pc = new RTCPeerConnection(pcConfig);
    //pc에 icecandidate, addstream, removestream 이벤트 추가
    //icecandidate는 서로 통신 채널 확립하기 위한 방법
    pc.onicecandidate = handleIceCandidate;
    //onaddstream은 remote스트림이 들어오면 발생하는 이벤트
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;

    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  //event.candidate가 존재하면 원격 유저에게 candidate를 전달
  //candidate => 통신하려는 후보자 
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } 
  // 모든 ICE candidate가 원격 유저에게 전달된 조건에서 실행
  else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

//pc.createOffer을 통해 통신 요청
function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

//서로 발견하고 자신들의 기능에 대한 정보를 교환하고 통화 세션 초기화 => 실시간 데이터 통신 시작
function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

//RTCPeerConnection.setLocalDescription()을 사용하여 로컬 SDP설명 설정
function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}


function requestTurn(turnURL) {
  var turnExists = true;   
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

//createPeerConnection함수에서 remoteStream이 들어왔을 경우 호출됨
//remoteVideo에 remoteStream을 저장(2번째 접속자 stream정보)
function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}

//remoteStream과 연결이 끊겼을 때 호출되는 함수
function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function hangupBTN() {
  hangup();
}

function endBTN(){
	
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}


function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}
