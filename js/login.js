var socket = io.connect();

function setname(){
	var username = document.getElementById("username").value; 
	if(username != null){
		socket.emit('set username', username);
		window.location.href = "/home.html";
	}
	else
		alert("유저네임을 입력해주세요");
}

