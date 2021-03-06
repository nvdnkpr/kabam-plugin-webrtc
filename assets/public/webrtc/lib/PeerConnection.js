// Base on - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/socket.io

(function() {

    // configValue = {socketURL, socketEvent, userid, roomid}
    window.PeerConnection = function(configValue) {
      
        this.userid = configValue.userid || getToken();
        this.peers = { };
        this.roomid = configValue.roomid;
        
        if (!configValue.socketURL) socketURL = '';
        else socketUrl = configValue.socketURL;
        
        if (!configValue.socketEvent) socketEvent = 'message';
        else socketEvent = configValue.socketEvent;
        
        var root = this;
        captureUserMedia(function() {            
            new Signaler(root, socketURL, socketEvent);
        }, root);
    };

    function Signaler(root, socketURL, socketEvent) {
        var self = this;

        root.startBroadcasting = function() {
            (function transmit() {
                console.log('Start Broadcasting');
                socket.send({                
                    userid: root.userid,
                    broadcasting: true
                });
                !self.participantFound &&
                    !self.stopBroadcasting &&
                        setTimeout(transmit, 3000);
            })();
        };        
                
        root.sendParticipationRequest = function(userid) {
            socket.send({
                participationRequest: true,
                userid: root.userid,                
                to: userid
            });
        };

        // if someone shared SDP
        this.onsdp = function(message) {
            var sdp = message.sdp;

            if (sdp.type == 'offer') {
                root.peers[message.userid] = Answer.createAnswer(merge(options, {
                    MediaStream: root.MediaStream,
                    sdp: sdp
                }));
            }

            if (sdp.type == 'answer') {
                root.peers[message.userid].setRemoteDescription(sdp);
            }
        };

        root.acceptRequest = function(userid) {
            root.peers[userid] = Offer.createOffer(merge(options, {
                MediaStream: root.MediaStream
            }));
        };

        var candidates = [];
        // if someone shared ICE
        this.onice = function(message) {
            var peer = root.peers[message.userid];
            if (peer) {
                peer.addIceCandidate(message.candidate);
                for (var i = 0; i < candidates.length; i++) {
                    peer.addIceCandidate(candidates[i]);
                }
                candidates = [];
            } else candidates.push(candidates);
        };

        // it is passed over Offer/Answer objects for reusability
        var options = {
            onsdp: function(sdp) {
                socket.send({                    
                    userid: root.userid,
                    sdp: sdp,
                    to: root.participant
                });
            },
            onicecandidate: function(candidate) {
                socket.send({                    
                    userid: root.userid,
                    candidate: candidate,
                    to: root.participant
                });
            },
            onStreamAdded: function(stream) {
                console.debug('onStreamAdded', '>>>>>>', stream);

                stream.onended = function() {
                    if (root.onStreamEnded) root.onStreamEnded(streamObject);
                };

                var mediaElement = document.createElement('video');
                mediaElement.id = root.participant;
                mediaElement[isFirefox ? 'mozSrcObject' : 'src'] = isFirefox ? stream : window.webkitURL.createObjectURL(stream);
                mediaElement.autoplay = true;
                mediaElement.controls = true;
                mediaElement.play();

                var streamObject = {
                    mediaElement: mediaElement,
                    stream: stream,
                    userid: root.participant,
                    type: 'remote'
                };                

                function afterRemoteStreamStartedFlowing() {
                    if (!root.onStreamAdded) return;
                    root.onStreamAdded(streamObject);
                }

                afterRemoteStreamStartedFlowing();
            }
        };

        function closePeerConnections() {
            self.stopBroadcasting = true;
            if (root.MediaStream) root.MediaStream.stop();

            for (var userid in root.peers) {
                root.peers[userid].peer.close();
            }
            root.peers = { };
        }

        root.close = function() {
            socket.send({                
                userLeft: true,
                userid: root.userid,
                to: root.participant
            });
            closePeerConnections();
        };

        window.onbeforeunload = function() {
            root.close();
        };

        window.onkeyup = function(e) {
            if (e.keyCode == 116)
                root.close();
        };

        if (!root.socket)
          var socket = io.connect(socketURL);
        else
          var socket = root.socket;
          
        socket.on(socketEvent, function(message) {
            if (message.userid == root.userid) return;
            root.participant = message.userid;

            // for pretty logging
            console.debug(JSON.stringify(message, function(key, value) {
                if (value && value.sdp) {
                    console.log(value.sdp.type, '---', value.sdp.sdp);
                    return '';
                } else return value;
            }, '---'));

            // if someone shared SDP
            if (message.sdp && message.to == root.userid) {
                self.onsdp(message);
            }

            // if someone shared ICE
            if (message.candidate && message.to == root.userid) {
                self.onice(message);
            }

            // if someone sent participation request
            if (message.participationRequest && message.to == root.userid) {
                self.participantFound = true;

                if (root.onParticipationRequest) {
                    root.onParticipationRequest(message.userid);
                } else root.acceptRequest(message.userid);
            }

            // if someone is broadcasting himself!
            if (message.broadcasting && root.onUserFound) {
                root.onUserFound(message.userid);
            }

            if (message.userLeft && message.to == root.userid) {
                closePeerConnections();
            }
        });

        socket.send = function(data) {
            socket.emit(socketEvent, data);
        };
    }

    var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
    var RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;

    navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
    window.URL = window.webkitURL || window.URL;

    var isFirefox = !!navigator.mozGetUserMedia;
    var isChrome = !!navigator.webkitGetUserMedia;

    var STUN = {
        url: isChrome ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121'
    };

    var TURN = {
        url: 'turn:homeo@turn.bistri.com:80',
        credential: 'homeo'
    };

    var iceServers = {
        iceServers: [STUN]
    };

    if (isChrome) {
        if (parseInt(navigator.userAgent.match( /Chrom(e|ium)\/([0-9]+)\./ )[2]) >= 28)
            TURN = {
                url: 'turn:turn.bistri.com:80',
                credential: 'homeo',
                username: 'homeo'
            };

        iceServers.iceServers = [STUN, TURN];
    }

    var optionalArgument = {
        optional: [{
            DtlsSrtpKeyAgreement: true
        }]
    };

    var offerAnswerConstraints = {
        optional: [],
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        }
    };

    function getToken() {
        return Math.round(Math.random() * 9999999999) + 9999999999;
    }

    // var offer = Offer.createOffer(config);
    // offer.setRemoteDescription(sdp);
    // offer.addIceCandidate(candidate);
    var Offer = {
        createOffer: function(config) {
            var peer = new RTCPeerConnection(iceServers, optionalArgument);

            if (config.MediaStream) peer.addStream(config.MediaStream);
            peer.onaddstream = function(event) {
                config.onStreamAdded(event.stream);
            };

            peer.onicecandidate = function(event) {
                if (event.candidate)
                    config.onicecandidate(event.candidate);
            };

            peer.createOffer(function(sdp) {
                peer.setLocalDescription(sdp);
                config.onsdp(sdp);
            }, null, offerAnswerConstraints);

            this.peer = peer;

            return this;
        },
        setRemoteDescription: function(sdp) {
            this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
        },
        addIceCandidate: function(candidate) {
            this.peer.addIceCandidate(new RTCIceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        }
    };

    // var answer = Answer.createAnswer(config);
    // answer.setRemoteDescription(sdp);
    // answer.addIceCandidate(candidate);
    var Answer = {
        createAnswer: function(config) {
            var peer = new RTCPeerConnection(iceServers, optionalArgument);

            if (config.MediaStream) peer.addStream(config.MediaStream);
            peer.onaddstream = function(event) {
                config.onStreamAdded(event.stream);
            };

            peer.onicecandidate = function(event) {
                if (event.candidate)
                    config.onicecandidate(event.candidate);
            };

            peer.setRemoteDescription(new RTCSessionDescription(config.sdp));
            peer.createAnswer(function(sdp) {
                peer.setLocalDescription(sdp);
                config.onsdp(sdp);
            }, null, offerAnswerConstraints);

            this.peer = peer;

            return this;
        },
        addIceCandidate: function(candidate) {
            this.peer.addIceCandidate(new RTCIceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        }
    };

    function captureUserMedia(callback, root) {
        var constraints = {
            audio: true,
            video: true
        };

        navigator.getUserMedia(constraints, onstream, onerror);

        function onstream(stream) {
            callback();

            stream.onended = function() {
                if (root.onStreamEnded) root.onStreamEnded(streamObject);
            };

            root.MediaStream = stream;

            var mediaElement = document.createElement('video');
            mediaElement.id = 'self';
            mediaElement[isFirefox ? 'mozSrcObject' : 'src'] = isFirefox ? stream : window.webkitURL.createObjectURL(stream);
            mediaElement.autoplay = true;
            mediaElement.controls = true;
            mediaElement.muted = true;
            mediaElement.play();

            var streamObject = {
                mediaElement: mediaElement,
                stream: stream,
                userid: 'self',
                type: 'local'
            };
            root.onStreamAdded(streamObject);
        }

        function onerror(e) {
            console.error(e);
        }
    }

    function merge(mergein, mergeto) {
        for (var t in mergeto) {
            mergein[t] = mergeto[t];
        }
        return mergein;
    }
    
})();
