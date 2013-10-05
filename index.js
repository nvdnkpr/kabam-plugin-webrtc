exports.name = 'kabamPluginWebrtc';

var path = require('path'),
  Grid = require('gridfs-stream'),
  async = require('async');
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

/* 
 * Utility functions
 */

function checkUserOnline(kabam, username) {
  var activeUsers = kabam.io.sockets.manager.handshaken,
    x;

  for (x in activeUsers) {
    if (activeUsers[x].user && activeUsers[x].user.username === username) {
      if (kabam.io.sockets.manager.sockets.sockets[x]) {
        return true;
      }
    }
  }

  return false;
}

exports.routes = function(kabam) {

  /*
   * TEST CALLING
   */
  kabam.app.get('/call/wait', function(request, response) {
    response.render('call/wait.html', {
      layout: 'call/layout.html'
    });
  });

  kabam.app.get(/^\/call\/room\/(.+)$/, function(request, response) {
    var roomId = request.params[0];
    var parameters = {
      layout: 'call/layout.html',
      roomId: roomId
    };
    response.render('call/room.html', parameters);
  });

  kabam.app.get(/^\/call\/user\/(.+)$/, function(request, response) {
    var username = request.params[0];
    var parameters = {
      layout: 'call/layout.html',
      username: username,
      csrf: response.locals.csrf
    };
    response.render('call/user.html', parameters);
  });

  // create a room when user call to another
  kabam.app.get(/^\/call\/call\/(.+)$/, function(request, response) {
    var username = request.params[0];
    var roomid = +(new Date()).getTime() + '' + (Math.round(Math.random() * 9999999999) + 9999999999);

    // Notified other user    
    kabam.emit('notify:sio', {
      user: {
        username: username
      },
      message: 'You have a call <a target="blank" href="/call/room/' + roomid + '">Click here</a>'
    });

    response.send(roomid.toString());
  });

  kabam.app.get('/call/record', function(request, response) {
    var parameters = {
      layout: 'call/layout.html',
      csrf: response.locals.csrf
    };
    response.render('call/record.html', parameters);
  });


  /*
   * CALLING API
   */

  kabam.app.get('/api/call/:username', function(request, response) {
    var username = request.params.username;

    // check if user online
    if (checkUserOnline(kabam, username)) {
      var roomid = +(new Date()).getTime() + '' + (Math.round(Math.random() * 9999999999) + 9999999999);

      // Notified other user    
      kabam.emit('notify:sio', {
        user: {
          username: username
        },
        message: 'You have a call <a target="blank" href="/call/room/' + roomid + '">Click here</a>'
      });

      var result = {
        roomId: roomid
      };

      response.json(result);
    } else {
      response.json({
        status: 'ERROR',
        errorCode: 'USER_NOT_ONLINE',
        message: username + ' is not online'
      });
    }
  });

  /*
   * WEBRTC RECORDING MESSAGE API
   */

  // Save recording
  // Post value: {audio, video}
  kabam.app.post('/api/recordings/:username', function(request, response) {
    if (request.user) {
      // Ensure receiver user is exist
      kabam.model.User.findOne({
        'username': request.params.username
      }, function(err, receiver) {
        if (!err) {
          // Save audio and video to GridFS          
          var gridFS = new Grid(kabam.mongoConnection.db, kabam.mongoose.mongo);

          // Change the bucket to  `recording`
          // gridFS.collection('recording');

          var fileNamePrefix = receiver._id + '_' + (new Date()).getTime() + '' + (Math.round(Math.random() * 9999999999) + 9999999999);

          // Save video file
          var videoName = fileNamePrefix + '.webm';
          var videoTempFile = request.files.video.path;
          var writeVideoStream = gridFS.createWriteStream({
            filename: videoName,
            metadata: {
              type: 'video'
            }
          });

          // Open video temporary and save it
          fs.createReadStream(videoTempFile)
            .on('end', function() {

              // Save audio file
              var audioName = fileNamePrefix + '.wav';
              var audioTempFile = request.files.audio.path;
              var writeAudioStream = gridFS.createWriteStream({
                filename: audioName,
                metadata: {
                  type: 'audio',
                  from: request.user._id,
                  to: receiver._id,
                  video: writeVideoStream.id,
                }
              });

              fs.createReadStream(audioTempFile)
                .on('end', function() {
                  // TODO: Send message for user

                  // Return response
                  response.json(201, {
                    'status': 201,
                    'description': 'Recording is send!'
                  });
                })
                .on('error', function() {
                  response.json(500, {
                    'status': 500,
                    'description': 'Cannot save recording.'
                  });
                })
                .pipe(writeAudioStream);

              response.json(201, {
                'status': 201,
                'description': 'Recording is send!'
              });
            })
            .on('error', function(err) {
              response.json(500, {
                'status': 500,
                'description': 'Cannot save recording.'
              });
            })
            .pipe(writeVideoStream);
        }
      });
    } else {
      response.send(400);
    }
  });

  // Get stream of record file by file name
  kabam.app.get('/api/recordings/:fileid/stream', function(request, response) {
    var fileid = request.params.fileid;

    var gridFS = new Grid(kabam.mongoConnection.db, kabam.mongoose.mongo);
    var readstream = gridFS.createReadStream({
      _id: fileid
    });

    readstream
      .on('error', function(err) {
        response.send(404);
      })
      .pipe(response);
  });

  //Get list voice mail of user (receiver)
  //url: /api/recording<?limit=..>&<offset=..>
  kabam.app.get('/api/recordingMessages', function(request, response) {
    if (request.user) {
      var mesgLimit = request.query['limit'] ? request.query['limit'] : 10,
        mesgOffset = request.query['offset'] ? request.query['offset'] : 0;

      var gridFS = new Grid(kabam.mongoConnection.db, kabam.mongoose.mongo);

      gridFS.files.find({
        'metadata.to': request.user._id,
        'metadata.type': 'audio'
      }, {
        skip: mesgOffset,
        limit: mesgLimit,
        sort: {
          'uploadDate': -1
        }
      }).toArray(function(err, recordingMessages) {
        if (err) {
          response.json(500, {
            'status': 500,
            'description': 'Cannot get recordings.'
          });
        } else {

          // Return result
          var i = 0,
            results = [];

          async.whilst(
            function() {
              return i < recordingMessages.length;
            },
            function(callback) {
              var recording = recordingMessages[i];
              var resultItem = {
                id: recording._id,
                from: {
                  id: recording.metadata.from
                },
                to: {
                  id: request.user.id,
                  username: request.user.username
                },
                time: recording.uploadDate,
                audio: recording._id,
                video: recording.metadata.video
              };

              kabam.model.User.findById(resultItem.from.id, function(err, user) {
                if (err) {
                  callback(err);
                } else {
                  resultItem.from.username = user.username;
                  results.push(resultItem);
                  callback(null);
                }
              });

              i++;

            },
            function(err) {
              response.json(results);
            }
          );

        }
      });
    } else {
      response.send(400);
    }
  });

  //Delete recording message of user (receiver)
  // DELETE: /api/recording/:id
  kabam.app.delete('/api/recordingMessages/:id', function(request, response) {
    
    if (request.user) {
      var id = request.params.id;
      var gridFS = new Grid(kabam.mongoConnection.db, kabam.mongoose.mongo);
      gridFS.files.findOne({
        '_id': gridFS.tryParseObjectId(id)
      }, function(err, audioFile) {
        if (err || !audioFile) {
          response.send(404);
        } else {
          if (audioFile.metadata.to.toString() !== request.user._id.toString()) {
            response.send(400);
          } else {
            gridFS.remove({
              _id: audioFile.metadata.video
            }, function(err) {
              if (err) {
                response.send(501);
              } else {
                // Remove audio file
                gridFS.remove({
                  _id: id
                }, function(err) {
                  if (err) {
                    response.send(501);
                  } else {
                    response.json({
                      status: 'ok'
                    });
                  }
                });
              }
            });
          }
        }
      });

    } else {
      response.send(400);
    }
  });

};


exports.app = function(kernel) {

  if (!kernel.io) {
    var io = require('socket.io').listen(kernel);
    io.set('origins', ['*']);
    kernel.io = io;
  }

  kernel.io.sockets.on('connection', function(socket) {

    if (!socket.handshake.user) {
      //console.log('---- NOT AUTHORIZE ----');
      return;
    }

    //console.log('socket.id: ' + socket.id);
    socket.emit('chat:id', socket.id);

    // handler join room from client
    socket.on('chat:joinRoom', function(room) {
      socket.room = room;
      socket.join(room);

      //console.log('-------CLIENT OF ------- ' + room);
      //console.log(kernel.io.sockets.clients(room).length);      
      //console.log('he join room');
    });

    socket.on('disconnect', function() {

      kernel.io.sockets. in (socket.room).emit('chat:disconnect', {
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
    socket.on('chat:newMessage', function(message) {
      //console.log(message);
      kernel.io.sockets. in (socket.room).emit('chat:newMessage', {
        content: message.content,
        user: socket.handshake.user.username
      });
    });

    socket.on('chat:video', function(data) {
      //console.log('------chat:video---------');
      //console.log(data);
      kernel.io.sockets. in (socket.room).emit('chat:video', data);
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