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

    it('should expand last error details', function(done) {
        var td = $('#sws_lerr_tErr_tbl').find("td.sws-row-expand").first();
        console.log('Click');
        td.trigger('click');
        setTimeout(function(){
            //expect($('#sws_errors').hasClass('active')).to.equal(true);
            var tr = $(td).closest('tr');
            var table = $('#sws_lerr_tErr_tbl').DataTable();
            var row = table.row(tr);
            expect(row.child.isShown()).to.equal(true);
            // There should be details row with data in it
            expect($(tr).next().length).to.equal(1);
            expect($(tr).next().find('td').length).to.equal(1);
            expect($(tr).next().find('td').find('pre').length).to.equal(1);
            done();
        },200);
    });

    it('should collaps last error details', function(done) {
        var td = $('#sws_lerr_tErr_tbl').find("td.sws-row-expand").first();
        td.trigger('click');
        setTimeout(function(){
            var tr = $(td).closest('tr');
            var table = $('#sws_lerr_tErr_tbl').DataTable();
            var row = table.row(tr);
            expect(row.child.isShown()).to.equal(false);
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

    it('should expand longest requests details', function(done) {
        var td = $('#sws_lreq_tReq_tbl').find("td.sws-row-expand").first();
        console.log('Click');
        td.trigger('click');
        setTimeout(function(){
            //expect($('#sws_errors').hasClass('active')).to.equal(true);
            var tr = $(td).closest('tr');
            var table = $('#sws_lreq_tReq_tbl').DataTable();
            var row = table.row(tr);
            expect(row.child.isShown()).to.equal(true);
            // There should be details row with data in it
            expect($(tr).next().length).to.equal(1);
            expect($(tr).next().find('td').length).to.equal(1);
            expect($(tr).next().find('td').find('pre').length).to.equal(1);
            done();
        },200);
    });

    it('should collapse longest requests details', function(done) {
        var td = $('#sws_lreq_tReq_tbl').find("td.sws-row-expand").first();
        td.trigger('click');
        setTimeout(function(){
            var tr = $(td).closest('tr');
            var table = $('#sws_lreq_tReq_tbl').DataTable();
            var row = table.row(tr);
            expect(row.child.isShown()).to.equal(false);
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

    it('should expand api operation details', function(done) {
        var td = $('#sws_api_tApi_tbl').find("td.sws-row-expand").first();
        console.log('Click');
        td.trigger('click');
        setTimeout(function(){
            //expect($('#sws_errors').hasClass('active')).to.equal(true);
            var tr = $(td).closest('tr');
            var table = $('#sws_api_tApi_tbl').DataTable();
            var row = table.row(tr);
            expect(row.child.isShown()).to.equal(true);
            // There should be details row with data in it
            expect($(tr).next().length).to.equal(1);
            expect($(tr).next().find('td').length).to.equal(1);
            expect($(tr).next().find('td').find('div').length).to.equal(1);
            done();
        },200);
    });

    it('should collapse api operation details', function(done) {
        var td = $('#sws_api_tApi_tbl').find("td.sws-row-expand").first();
        td.trigger('click');
        setTimeout(function(){
            var tr = $(td).closest('tr');
            var table = $('#sws_api_tApi_tbl').DataTable();
            var row = table.row(tr);
            expect(row.child.isShown()).to.equal(false);
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

    it('should collapse api operation info', function(done) {
        var widget = $('#sws_apiop_wPath').find('.swsbox');
        console.log('Click');
        widget.trigger('click');
        setTimeout(function(){
            expect($(widget).find('.swsbox-collapse').length).to.equal(1);
            expect($(widget).find('.swsbox-collapse').hasClass('fa-chevron-down')).to.equal(true);
            expect($(widget).find('.swsbox-content').length).to.equal(1);
            expect($(widget).find('.swsbox-content').is(":visible")).to.equal(false);
            done();
        },200);
    });

    it('should expand api operation info', function(done) {
        var widget = $('#sws_apiop_wPath').find('.swsbox');
        console.log('Click');
        widget.trigger('click');
        setTimeout(function(){
            expect($(widget).find('.swsbox-collapse').length).to.equal(1);
            expect($(widget).find('.swsbox-collapse').hasClass('fa-chevron-up')).to.equal(true);
            expect($(widget).find('.swsbox-content').length).to.equal(1);
            expect($(widget).find('.swsbox-content').is(":visible")).to.equal(true);
            done();
        },200);
    });

    it('should expand api operation parameter details', function(done) {
        var td = $('#sws_apiop_tParams_tbl').find("td.sws-row-expand").first();
        td.trigger('click');
        setTimeout(function(){
            var tr = $(td).closest('tr');
            var table = $('#sws_apiop_tParams_tbl').DataTable();
            var row = table.row(tr);
            expect(row.child.isShown()).to.equal(true);
            // There should be details row with data in it
            expect($(tr).next().length).to.equal(1);
            expect($(tr).next().find('td').length).to.equal(1);
            expect($(tr).next().find('td').find('pre').length).to.equal(1);
            done();
        },200);
    });

    it('should collapse api operation parameter details', function(done) {
        var td = $('#sws_apiop_tParams_tbl').find("td.sws-row-expand").first();
        td.trigger('click');
        setTimeout(function(){
            var tr = $(td).closest('tr');
            var table = $('#sws_apiop_tParams_tbl').DataTable();
            var row = table.row(tr);
            expect(row.child.isShown()).to.equal(false);
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

    it('should refresh data', function(done) {
        $('.sws-refresh').trigger('click');
        setTimeout(function(){
            done();
        },200);
    });


    it('should wait a little ', function(done) {
        setTimeout(function(){done();},200);
    });

});
