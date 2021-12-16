# WebRTC
WebRTC를 이용한 1:1 화상회의 웹 만들기

-------
## 환경세팅
```c
Ubuntu 18.04
Node 14.17.3 이상
npm 6.14.14
```

## 기능

+ 닉네임 설정
+ 방 생성
+ 방 리스트
+ 방 인원수 
+ 방 삭제
+ 음소거 & 카메라 on/off
+ 방 나가기

## 구현화면

1. 로그인창
<img src="https://user-images.githubusercontent.com/57535999/146339793-bfa6c8f6-e1fb-44a5-ad96-6d8db40b1126.png" width="400" height="300">

2. 대기방
<img src="https://user-images.githubusercontent.com/57535999/146340379-43b01637-193d-419b-85bb-bb6258446dfa.png" width="400" height="300">

3. 회의방
<img src="https://user-images.githubusercontent.com/57535999/146340461-a771f825-5f46-4473-9ee8-06714e006ca0.png" width="400" height="300">

## 설정
본인 도메인이 없을 경우 OpenSSL을 이용하여 키를 생성한 다음 node 서버 코드 수정
```c
..
const options = {
  key: fs.readFileSync(__dirname + '/../private.pem'),
  cert: fs.readFileSync(__dirname + '/../public.pem') 
};
..
```
본인 도메인이 있을 경우 letsencrypt를 이용하여 키를 생성한 다음 node 서버 코드 수정
```c
..
const options = {
  key: fs.readFileSync('./../../../../etc/letsencrypt/live/본인 도메인 주소/privkey.pem'),
  cert: fs.readFileSync('./../../../../etc/letsencrypt/live/본인 도메인 주소/cert.pem')
};
..
```
그리고 turn서버 설치 방법을 찾아 설치하고 ICE 사이트에서 잘 실행되는지 확인한 다음 main.js에서 turn서버 정보 수정


```c
..
var pcConfig = {
  'iceServers': [
     { 'urls': 'stun:stun.l.google.com:19302' },
     { 'urls': 'turn:본인 도메인 주소', 'username': '계정', 'credential': '비밀번호'}
  ]
};
..
```
## 실행
코드를 수정한 후 다음 명령을 실행
```c
sudo node server.js
```
도메인이 없을 경우 1번째, 있을 경우 2번째 URL을 실행
1. http://localhost:3000 
2. https://본인도메인:3000
