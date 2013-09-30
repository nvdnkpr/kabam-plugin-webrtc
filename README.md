kabam-plugin-webrtc
===================

WebRTC feature for kabam

Under construction
==================

* This plugin is under construction *

Require to run
==============

1. Include socket.io in html layout
2. Enable socket.js notify in client (layout file) like bellow (It help to show notification to user when having incoming call)

```javascript
socket.on('notify', function (data) {
    $('#flash').append('<div class="alert alert-info"><a class="close" data-dismiss="alert">×</a><strong>'+data.message+'</strong></div>');
});
````

Make a call
===========

Step to make a call from user 1 to user 2

1. Client 1 login to user 1
2. Client 2 login to user 2
3. Client 1 go to /webrtc/user/<username 2>
4. Client 2 go to /webrtc/wait (it may be any page have socket.io enabled)
5. Client 1 click to button "Call to user 2". New page will open
6. Client 2 click to the link of notify
7. Start video call !
