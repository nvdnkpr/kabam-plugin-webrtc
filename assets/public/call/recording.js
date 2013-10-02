  var localStream;
  function saveBlob(blob, fileType, fileName) {
    // Form data
    var formData = new FormData();
    formData.append('fileType', fileType);
    formData.append(fileType + '_blob', blob);
    formData.append('_csrf', _csrf);

    $.ajax({
      url: '/call/save-record',
      type: 'post',
      data: formData,      
      processData: false,
      contentType: false,
      success: function(data) {
        console.log(data);
      }
    })
  };

  var videoPreview = document.getElementById('preview');
  var video_constraints = {
    mandatory: {},
    optional: []
  };  

  var recordAudio, recordVideo;

  // Click record button
  $('#btn-record').click(function(){
    $(this).attr('disabled', 'disabled');
    navigator.getUserMedia(
      {audio: true, video: video_constraints},
      function (stream){
        localStream = stream;
        videoPreview.src = window.URL.createObjectURL(stream); 
        videoPreview.play();

        recordAudio = RecordRTC(stream, {});

        recordVideo = RecordRTC(stream, { type: 'video'});

        recordAudio.startRecording();
        recordVideo.startRecording();
      },
      function(error){}
    );
  });

  // Click stop button: stop recording and upload
  $('#btn-stop').click(function(){
    var fileName = "test";

    recordAudio.stopRecording();
    saveBlob(recordAudio.getBlob(), 'audio', fileName + '.wav');

    recordVideo.stopRecording();
    saveBlob(recordVideo.getBlob(), 'video', fileName + '.webm');

    videoPreview.src = "";

    localStream.stop();
  });