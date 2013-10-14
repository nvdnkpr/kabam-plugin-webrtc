var _csrf = '[[ csrf ]]';
var homeOwner = '[[username]]';
var localStream;

var videoPreview = document.getElementById('preview');
var video_constraints = {
  mandatory: {},
  optional: []
};

var recordAudio, recordVideo;

function UserCtrl($scope, $http) {

  $scope.showRecording = false;
  $scope.data = {
    selected: '',
    // TODO replace me with the real user contacts
    onlineContacts: [
      'caller1',
      'caller2'
    ]
  };

  $scope.call = function(username) {
    $http.get('/call/call/' + username)
      .success(function(data) {
        window.open("/call/room/" + data, '_self');
      });
  }

  $scope.leaveMessage = function(username) {
    $scope.showRecording = true;
  }

  // Do recording
  $scope.record = function() {
    // Get media and record
    navigator.getUserMedia({
        audio: true,
        video: video_constraints
      },
      function(stream) {
        localStream = stream;
        videoPreview.src = window.URL.createObjectURL(stream);
        videoPreview.play();

        recordAudio = RecordRTC(stream, {});
        recordVideo = RecordRTC(stream, {
          type: 'video'
        });

        recordAudio.startRecording();
        recordVideo.startRecording();
      },
      function(error) {}
    );
  }

  // Stop recording
  $scope.stopRecord = function() {
    recordAudio.stopRecording();
    recordVideo.stopRecording();

    $scope.saveRecord(recordAudio.getBlob(), recordVideo.getBlob());

    videoPreview.src = "";

    localStream.stop();
  }

  // Save record to server
  $scope.saveRecord = function(audioBlob, videoBlob) {
    var formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('video', videoBlob);
    //formData.append('_csrf', _csrf);


    $http({
      method: 'POST',
      url: '/api/recordings/' + homeOwner,
      data: formData,
      transformRequest: angular.identity,
      headers: {
        'Content-Type': undefined
      }
    })
      .success(function(data) {
        console.log(data);
      });
  }
}