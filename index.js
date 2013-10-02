var path = require('path'),
  GridFSStreamAdapter = require('./lib/GridFSStreamAdapter.js'),
  Grid = require('gridfs-stream');

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

var fs = require('fs');

exports.routes = function(kabam){
  kabam.app.get('/call/wait', function(request,response) {
    response.render('call/wait.html', { layout: 'call/layout.html'});
  });
    
  kabam.app.get(/^\/call\/room\/(.+)$/, function(request, response){
    var roomId = request.params[0];
    var parameters = {
      layout: 'call/layout.html',
      roomId: roomId
    };
    response.render('call/room.html',parameters);
  });
  
  kabam.app.get(/^\/call\/user\/(.+)$/, function(request, response){
    var username = request.params[0];
    var parameters = {
      layout: 'call/layout.html',
      username: username,
      csrf: response.locals.csrf
    };
    response.render('call/user.html',parameters);
  });

  // create a room when user call to another
  kabam.app.get(/^\/call\/call\/(.+)$/, function(request, response){
    var username = request.params[0];
    var roomid = + (new Date()).getTime() + '' + (Math.round(Math.random() * 9999999999) + 9999999999);

    // Notified other user    
    kabam.emit('notify:sio', {user: {username: username}, message: 'You have a call <a target="blank" href="/call/room/' + roomid + '">Click here</a>'});

    response.send(roomid.toString());
  });

  kabam.app.get('/call/record', function(request,response) {
    var parameters = {
      layout: 'call/layout.html',
      csrf: response.locals.csrf
    };
    response.render('call/record.html', parameters);
  });

  // Save recording
  // Post value: {audio, video}
  kabam.app.post('/api/recordings/:username', function(request,response) {
    if(request.user) {
      // Save audio and video to GridFS
      var gridFS = new GridFSStreamAdapter(new Grid(kabam.mongoConnection.db, kabam.mongoose.mongo));

      var fileNamePrefix = request.params[0] + '_' + (new Date()).getTime() + '' + (Math.round(Math.random() * 9999999999) + 9999999999);  
      
      // Save video file
      var videoName = fileNamePrefix + '_video.webm';
      var videoTempFile = request.files.video.path;
      var writeVideoStream = gridFS.createWriteStream({ filename: videoName });

      // Open video temporary and save it
      gridFS.createReadStream(videoTempFile)
        .on('end', function(){
          // Save audio file
          var audioName = fileNamePrefix + '_audio.wav';
          var audioTempFile = request.files.audio.path;
          var writeAudioStream = gridFS.createWriteStream({ filename: audioName });

          gridFS.createReadStream(audioTempFile)
            .on('end', function() {
              // TODO: Send message for user
              
              // Return response
              response.json(201,{'status':201,'description':'Recording is send!'});
            })
            .on('error', function(){
              response.json(500, {'status':500,'description':'Cannot save recording.'});
            })
        })
        .on('error', function(){
          response.json(500, {'status':500,'description':'Cannot save recording.'});
        })
        .pipe(writeVideoStream);      
    } else {
      response.send(400);
    }
  });
};


exports.app = function(kernel) {

  kernel.io.sockets.on('connection', function(socket){

    if (!socket.handshake.user) {
      //console.log('---- NOT AUTHORIZE ----');
      return;
    }

    //console.log('socket.id: ' + socket.id);
    socket.emit('chat:id', socket.id);
    
    // handler join room from client
    socket.on('chat:joinRoom', function(room){
      socket.room = room;
      socket.join(room);

      //console.log('-------CLIENT OF ------- ' + room);
      //console.log(kernel.io.sockets.clients(room).length);      
      //console.log('he join room');
    });
    
    socket.on('disconnect', function(){

      kernel.io.sockets.in(socket.room).emit('chat:disconnect', {
        userid: socket.id,
        roomid: socket.room,
        user: socket.handshake.user.username,
        content: 'Left the room',
      });

      socket.leave(socket.room);

      // console.log(socket.handshake.user.username + '--- disconnect --');
      // console.log('-------CLIENT OF ------- ' + socket.room);
      // console.log(kernel.io.sockets.clients(socket.room).length);

    });
    
    // handler new message from client
    socket.on('chat:newMessage', function(message){
      //console.log(message);
      kernel.io.sockets.in(socket.room).emit('chat:newMessage', {content: message.content, user: socket.handshake.user.username});
    });
    
    socket.on('chat:video', function(data){
      //console.log('------chat:video---------');
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