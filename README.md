# kabam-plugin-webrtc
[![Build Status](https://travis-ci.org/mykabam/kabam-plugin-webrtc.png?branch=fix-ci)](https://travis-ci.org/mykabam/kabam-plugin-webrtc)
[![Dependency Status](https://gemnasium.com/mykabam/kabam-plugin-webrtc.png)](https://gemnasium.com/mykabam/kabam-plugin-webrtc)

WebRTC feature for kabam

## Notice

We are working hard to make things works great for you, if you find anything wrong or something that we should fix, [let us know](https://github.com/mykabam/kabam-plugin-webrtc/issues), or help us to fix it by [sending a pull request](https://github.com/mykabam/kabam-plugin-webrtc/pulls).

## Required to run

1. Include socket.io in html layout
2. Enable socket.js notify in client (layout file) like bellow (It help to show notification to user when having incoming call)

````
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

## Contribution Guidelines

TBD
