if (typeof io !== 'undefined') {
  var socket = io.connect();
  socket.on('broadcast', function(data) {
    $('#clock').html(data.time);
  });
  socket.on('notify', function(data) {
    $.pnotify.defaults.history = false;
    $.pnotify({
      title: 'Incoming calls',
      text: '<p> <a class="btn btn-success" target="_self" href="/call/room/' + data.message + '">Accept</a> <a href="#" class="btn btn-danger">Reject</a></p>'
    });
  });
}