'use strict';

/*
 * Unit tests for embedded swagger-stats UI
 */

describe('SWSUI', function() {
  this.timeout(60000);

  // inject the HTML fixture for the tests
  before(function() {

      // Why this line? See: https://github.com/billtrik/karma-fixture/issues/3
    fixture.setBase('test/ui');
    fixture.load('fixture.html');

    // init js lib
    //window.calculator.init();
  });

  // remove the html fixture from the DOM
  after(function() {
    fixture.cleanup();
  });

    it('should have navigation controls', function(done) {
      setTimeout(function(){
        should.exist(document.getElementById('sws_summary'));
        should.exist(document.getElementById('sws_requests'));
        should.exist(document.getElementById('sws_errors'));
        should.exist(document.getElementById('sws_lasterrors'));
        should.exist(document.getElementById('sws_longestreq'));
        should.exist(document.getElementById('sws_rates'));
        should.exist(document.getElementById('sws_payload'));
        should.exist(document.getElementById('sws_api'));
        should.exist(document.getElementById('sws_apiop'));
        done();
      },2000);
    });

    it('should change view', function(done) {
        $('#sws_requests').find("a")[0].click();
        setTimeout(function(){done();},1000);
    });

    it('should wait', function(done) {
        setTimeout(function(){done();},5000);
    });

});
