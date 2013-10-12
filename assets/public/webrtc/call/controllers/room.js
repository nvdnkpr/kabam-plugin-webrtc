  var remoteVideoContainer = document.getElementById('remote-video-container');
  var localVideoContainer = document.getElementById('local-video-container');

  var socket = io.connect('');
  var userId;
  var roomsList = document.getElementById('rooms-list');

  function RoomController($scope, $http) {

    $scope.room = {
      messages: [],
      newMessage: ''
    };

    $scope.sendMessage = function() {
      socket.emit('chat:newMessage', {
        content: $scope.room.newMessage
      });
      $scope.room.newMessage = '';
    }

    $scope.startBroadcasting = function() {
      peer.startBroadcasting();
    }

    socket.on('chat:newMessage', function(data) {
      //console.log(data);
      $scope.room.messages.push(data);
      $scope.$apply();
    });

    // partner disconnect
    socket.on('chat:disconnect', function(data) {
      //console.log(data);
      if (roomId == data.roomid) {
        $('#' + data.userid).remove();
        $scope.room.messages.push(data);
        $scope.$apply();
      }
    });

  }

  // CHAT - CALLING
  socket.on('connect', function() {
    //console.log('connect');
    socket.emit('chat:joinRoom', roomId);

    socket.on('chat:id', function(id) {
      userId = id;

      var peer = new PeerConnection({
        socketEvent: 'chat:video',
        roomid: roomId,
        socket: socket,
        userid: id
      });

      // Video 1-1

      peer.onStreamAdded = function(e) {
        //if (e.type == 'local') document.querySelector('#start-broadcasting').disabled = false;
        var video = e.mediaElement;
        video.setAttribute('width', '100%');
        video.setAttribute('controls', false);

        console.log(video);

        if (e.type == 'local') {
          localVideoContainer.insertBefore(video, null);
        } else {
          // Just add 1 remote video for 1 user
          if (remoteVideoContainer.childElementCount > 0 && document.getElementById(e.userid)) return;              
          // Add new remote video
          remoteVideoContainer.insertBefore(video, null);
        }

        video.play();
        //rotateVideo(video);
        //scaleVideos();
      };

      peer.onUserFound = function(userid) {
        if (document.getElementById(userid)) return;
        var tr = document.createElement('tr');
        tr.id = userid;

        var td1 = document.createElement('td');


        //td1.innerHTML = userid;

        tr.appendChild(td1);
        peer.sendParticipationRequest(userid);

        //roomsList.appendChild(tr);
      };

      // Auto broadcasting
      (function startBroadcast() {
        if (peer.startBroadcasting) peer.startBroadcasting();
        else setTimeout(startBroadcast, 1000);
      })();
    });

  });