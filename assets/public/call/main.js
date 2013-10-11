var callModule = angular.module('KabamCall', []);


callModule.factory('socket', function onSocket($rootScope) {

  var socket = io.connect();

  return {
    on: function(eventName, cb) {

      socket.on(eventName, function onListening() {
        var args = arguments;

        $rootScope.$apply(function onApply() {
          cb.apply(socket, args);
        });
      });
    },

    emit: function (eventName, data, cb) {

      socket.emit(eventName, data, function onEmit() {
        var args = arguments;

        $rootScope.$apply(function onApply() {
          if(cb) cb.apply(socket, args);
        });
      });
    }
  };
});