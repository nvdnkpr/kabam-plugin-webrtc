# kabam-plugin-webrtc
[![Build Status](https://travis-ci.org/mykabam/kabam-plugin-webrtc.png?branch=fix-ci)](https://travis-ci.org/mykabam/kabam-plugin-webrtc)
[![Dependency Status](https://gemnasium.com/mykabam/kabam-plugin-webrtc.png)](https://gemnasium.com/mykabam/kabam-plugin-webrtc)

WebRTC feature for kabam

## Notice

We are working hard to make things works great for you, if you find anything wrong or something that we should fix, [let us know](https://github.com/mykabam/kabam-plugin-webrtc/issues), or help us to fix it by [sending a pull request](https://github.com/mykabam/kabam-plugin-webrtc/pulls).

## Require to run

1. Include socket.io in html layout
2. Enable socket.js notify in client (layout file) like bellow (It help to show notification to user when having incoming call)

```javascript
socket.on('notify', function (data) {
    $('#flash').append('<div class="alert alert-info"><a class="close" data-dismiss="alert">×</a><strong>'+data.message+'</strong></div>');
});
````

## Make a call

Step to make a call from user 1 to user 2

1. Client 1 login to user 1
2. Client 2 login to user 2
3. Client 1 go to /call/user/{username 2}
4. Client 2 go to /call/wait (it may be any page have socket.io enabled)
5. Client 1 click to button "Call to user 2". New page will open
6. Client 2 click to the link of notify
7. Start video call !

## APIs Documentation

### Calling API

1. Call a user


  GET: /api/call/{username}
  Return: {roomId}

  (go to /call/room/{roomId} to start a calling)


### Recording Message API

1. Send a recording message

  POST: /api/recordings/{username}
  Post value:
    audio: audio data 
    video: video data

2. Get stream of recording file
  
  GET: /api/recordings/{fileid}/stream

  Can use in audio , video html5 tag.

3. Get list recording messages of user
  
  GET: /api/recordingMessages

4. Delete a recording message of user (receiver)

  DELETE: /api/recordingMessage/{id}


## Example show list of recording message

Login and go to link /call/recordingMessages to see list of recording message
