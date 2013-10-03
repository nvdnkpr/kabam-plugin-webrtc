var should = require('should');

describe('index', function () {

  var webRtcPlugin = require('./../index.js');
  
  it('should load the plugin', function () {
    should.exist(webRtcPlugin);
  });
});