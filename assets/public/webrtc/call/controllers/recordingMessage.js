angular.module('kabam', ['ui.bootstrap']);

function RecordingMessageCtrl($scope, $http, $modal) {
    $scope.voiceMessages = [];

    $http.get('/api/recordingMessages', {responseType: 'json'})
      .success(function(data){
        $scope.voiceMessages = data;

      });

    $scope.playMail = function(message) {          
      var playVoiceMailInstance = $modal.open({
        templateUrl: 'playMailContent.html',
        controller: ModalOpenVoiceMailCtrl,
        resolve: {
          message: function() { return message;}
        }
      });

      playVoiceMailInstance.opened.then(function(){
        // // Sync audio and video
        // console.log('-----------');
        // console.log($('#audio-content').attr('src'));

        // var audioContent = Popcorn('#audio-content');
        // var videoContent = Popcorn('#video-content');

        // audioContent.on('play', function(){
        //   videoContent.play();
        // });

        // audioContent.on('pause', function(){
        //   videoContent.pause();
        // });

        // videoContent.on('play', function(){
        //   audioContent.play();
        // });

        // videoContent.on('pause', function(){
        //   audioContent.pause();
        // });
      });
    };
  }

function ModalOpenVoiceMailCtrl($scope, $modalInstance, message) {
  
  $scope.message = message;
  
  $scope.viewVoiceMailDone = function() {
    $modalInstance.close();
  };
}