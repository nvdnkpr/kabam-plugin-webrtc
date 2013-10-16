exports.name = 'kabamPluginWebrtc';

var Grid = require('gridfs-stream'),
  async = require('async');

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

  kabam.app.get(/^\/call\/room\/(.+)$/, function(request, response) {
    var roomId = request.params[0];
    var parameters = {
      layout: false,
      roomId: roomId
    };
    response.render('webrtc/call/room.html', parameters);
  });

  kabam.app.get(/^\/call\/user\/(.+)$/, function(request, response) {
    var username = request.params[0];
    var parameters = {
      layout: false,
      username: username,
      csrf: response.locals.csrf
    };
    response.render('webrtc/call/user.html', parameters);
  });

  // generate a room ID
  kabam.app.get(/^\/call\/call\/(.+)$/, function(request, response) {
    var username = request.params[0];
    var roomid = +(new Date()).getTime() + '' + (Math.round(Math.random() * 9999999999) + 9999999999);

    // Notified other user    
    kabam.emit('notify:sio', {
      user: {
        username: username
      },
      message: roomid
    });

    response.send(roomid.toString());
  });

  kabam.app.get('/call/record', function(request, response) {
    var parameters = {
      layout: false,
      csrf: response.locals.csrf
    };
    response.render('webrtc/call/record.html', parameters);
  });

  // Example url of show recording message list
  kabam.app.get('/call/recordingMessages', function(request, response){
    var parameters = {
      layout: false,      
    };
    response.render('webrtc/call/recording-message-example.html', parameters);
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
        message: 'You have a call <a target="_self" href="/call/room/' + roomid + '">Click here</a>'
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
    console.log('*** WEBRTC ***');
    console.log('WE MUST ENABLE SOCKET.IO, PLEASE SET THE CONFIG.IO TO TRUE');
    return;
  }

  kernel.io.sockets.on('connection', function(socket) {

    if (!socket.handshake.user) {
      //console.log('---- NOT AUTHORIZE ----');
      return;
    }
    
    socket.emit('chat:id', socket.handshake.user._id);

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