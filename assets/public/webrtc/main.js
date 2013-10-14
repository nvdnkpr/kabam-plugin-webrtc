//= require ./lib/notification.js
//= require ./call/controllers/user.js

var webRtcModule = angular.module('webRtc', ['kabam.states']);

webRtcModule.config([
  'kabamStatesProvider',
  function(kabamStatesProvider) {

    kabamStatesProvider.push([{
      name: 'callMain',
      url: '/call',
      templateUrl: '/assets/webrtc/views/index.html'
    }]);
  }
]);