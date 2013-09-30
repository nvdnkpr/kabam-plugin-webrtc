/*
var os = require('os'),
  async = require('async');

var junction = require('junction')
  , Message = junction.elements.Message
  , argv = require('optimist').argv;
  
var j = junction.create();

var options = {
  type: 'client',
  jid: 't01@192.168.2.110',
  password: '',
};  
*/

exports.routes = function(mwc){       
  mwc.app.get('/webrtc/wait', function(request,response) {  
    response.render('webrtc/wait.html');  
  });
    
  mwc.app.get(/^\/webrtc\/room\/(.+)$/, function(request, response){
    var roomId = request.params[0];
    var parameters = {
      roomId: roomId
    };
    response.render('webrtc/room.html',parameters);
  });
  
  mwc.app.get(/^\/webrtc\/user\/(.+)$/, function(request, response){
    var username = request.params[0];
    var parameters = {
      username: username
    }
    response.render('webrtc/user.html',parameters);
  });

  // create a room when user call to another
  mwc.app.get(/^\/webrtc\/call\/(.+)$/, function(request, response){
    var username = request.params[0];
    roomid = Math.round(Math.random() * 9999999999) + 9999999999;

    // Notified other user    
    mwc.emit('notify:sio', {user: {username: username}, message: 'You have a call <a target="blank" href="/webrtc/room/' + roomid + '">Click here</a>'});

    response.send(roomid.toString());
  });
};


exports.app = function(kernel) {  
    
  kernel.io.sockets.on('connection', function(socket){        
    
    console.log('socket.id: ' + socket.id);
    socket.emit('chat:id', socket.id);
    
    // handler join room from client
    socket.on('chat:joinRoom', function(room){
      socket.room = room;
      socket.join(room);
      console.log('he join room');
    });
    
    socket.on('disconnect', function(){
      console.log('--- disconnect --');
    });  
    
    // handler new message from client
    socket.on('chat:newMessage', function(message){
      console.log(message);
      kernel.io.sockets.in(socket.room).emit('chat:newMessage', {content: message.content, user: socket.handshake.user.username});
    });
    
    socket.on('chat:video', function(data){
      console.log('------chat:video---------');
      //console.log(data);
      kernel.io.sockets.in(socket.room).emit('chat:video', data);
    });
  });
  
};

/////// Add XMPP
/*
exports.app = function(kernel) {

    // Junction handler
    j.use(junction.presence(function(handler) {
      handler.on('available', function(stanza) {
        console.log(stanza.from + ' is available');
      });
      handler.on('unavailable', function(stanza) {
        console.log(stanza.from + ' is unavailable');
      });
    }));
    
    j.use(junction.messageParser());
    j.use(junction.message(function(handler) {  
      handler.on('chat', function(stanza) {
        
        console.log('------------ffs---------------');    
        //console.log(stanza.children[0]);    
        var msg = new Message(stanza.from, '', 'chat'); 
        msg.c('body', {}).t('tk');
        stanza.connection.send(msg);
        //console.log(stanza.connection);
        console.log(msg.children[0]);
        
      });  
    }));
    
    j.use(junction.serviceUnavailable());
    j.use(junction.errorHandler());
    
    j.connect(options).on('online', function() {
      console.log('Connected as: ' + this.jid);
      this.send(new junction.elements.Presence());
    });

};

*/