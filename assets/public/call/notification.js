if (typeof io !== 'undefined') {
  var socket = io.connect();
  socket.on('broadcast', function(data) {
    $('#clock').html(data.time);
  });
  socket.on('notify', function(data) {
    $('#flash').append('<div class="alert alert-info"><a class="close" data-dismiss="alert">×</a><strong>' + data.message + '</strong></div>');
  });
}