'use strict';

/*
 * Unit tests for embedded swagger-stats UI
 */

describe('SWSUI', function() {
  this.timeout(600000);

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
        expect($('#sws_summary').hasClass('active')).to.equal(true);
        done();
      },2000);
    });

    it('should open requests view', function(done) {
        $('#sws_requests').find("a")[0].click();
        setTimeout(function(){
            expect($('#sws_requests').hasClass('active')).to.equal(true);
            done();
        },200);
    });

    it('should open errors view', function(done) {
        $('#sws_errors').find("a")[0].click();
        setTimeout(function(){
            expect($('#sws_errors').hasClass('active')).to.equal(true);
            done();
        },200);
    });

    it('should open last errors view', function(done) {
        $('#sws_lasterrors').find("a")[0].click();
        setTimeout(function(){
            expect($('#sws_lasterrors').hasClass('active')).to.equal(true);
            done();
        },200);
    });

    it('should open longest requests view', function(done) {
        $('#sws_longestreq').find("a")[0].click();
        setTimeout(function(){
            expect($('#sws_longestreq').hasClass('active')).to.equal(true);
            done();
        },200);
    });

    it('should open rates view', function(done) {
        $('#sws_rates').find("a")[0].click();
        setTimeout(function(){
            expect($('#sws_rates').hasClass('active')).to.equal(true);
            done();
        },200);
    });

    it('should open payload view', function(done) {
        $('#sws_payload').find("a")[0].click();
        setTimeout(function(){
            expect($('#sws_payload').hasClass('active')).to.equal(true);
            done();
        },200);
    });

    it('should open api view', function(done) {
        $('#sws_api').find("a")[0].click();
        setTimeout(function(){
            expect($('#sws_api').hasClass('active')).to.equal(true);
            done();
        },200);
    });

    it('should open api operation view', function(done) {
        $('#sws_apiop').find("a")[0].click();
        setTimeout(function(){
            expect($('#sws_apiop').hasClass('active')).to.equal(true);
            done();
        },200);
    });

    it('should open summary view', function(done) {
        $('#sws_summary').find("a")[0].click();
        setTimeout(function(){
            expect($('#sws_summary').hasClass('active')).to.equal(true);
            done();
        },200);
    });

    it('should wait 1 sec', function(done) {
        setTimeout(function(){done();},1000);
    });

});
