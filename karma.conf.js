'use strict';

var fs = require('fs');
var path = require('path');
var express = require('express');
var supertest = require('supertest');
var debug = require('debug')('sws:karma');

var appConfig = require('./test/karma.config');

// Including swagger-stats module directly
//var swStats = require('./lib/index');

//process.env.DEBUG = "sws:*";
process.env.SWS_AUTHTEST_MAXAGE = 60;
process.env.SWS_SPECTEST_URL = './examples/authtest/petstore.yaml';

var swsTestApp = require('./examples/authtest/authtest');
var api = supertest('http://localhost:3050');

/*
api.get('/mockapi/v1/success')
    .set('x-sws-res','{"code":"200","message":"TEST","delay":"0","payloadsize":"0"}')
    .expect(200).end(function (err, res) {if (err) debug('Req error: ' + err); });
api.get('/mockapi/v1/redirect')
    .set('x-sws-res','{"code":"302","message":"TEST","delay":"0","payloadsize":"0"}')
    .expect(302).end(function (err, res) {if (err) debug('Req error: ' + err); });
api.get('/mockapi/v1/client_error')
    .set('x-sws-res','{"code":"404","message":"TEST","delay":"0","payloadsize":"0"}')
    .expect(404).end(function (err, res) {if (err) debug('Req error: ' + err); });
api.get('/mockapi/v1/server_error')
    .set('x-sws-res','{"code":"500","message":"TEST","delay":"0","payloadsize":"0"}')
    .expect(500).end(function (err, res) {if (err) debug('Req error: ' + err); });
*/

api.get('/v2/pet/findByTags')
    .set('x-sws-res','{"code":"200","message":"TEST","delay":"0","payloadsize":"0"}')
    .expect(200).end(function (err, res) {if (err) debug('Req error: ' + err); });
api.get('/v2/pet/findByTags')
    .set('x-sws-res','{"code":"302","message":"TEST","delay":"0","payloadsize":"0"}')
    .expect(302).end(function (err, res) {if (err) debug('Req error: ' + err); });
api.get('/v2/pet/findByTags')
    .set('x-sws-res','{"code":"404","message":"TEST","delay":"0","payloadsize":"0"}')
    .expect(404).end(function (err, res) {if (err) debug('Req error: ' + err); });
api.get('/v2/pet/findByTags')
    .set('x-sws-res','{"code":"500","message":"TEST","delay":"0","payloadsize":"0"}')
    .expect(500).end(function (err, res) {if (err) debug('Req error: ' + err); });

/*
api.get('/api/v1/redirect').expect(302).end(function (err, res) {if (err) debug('Req error: ' + err); });
api.get('/api/v1/client_error').expect(404).end(function (err, res) {if (err) debug('Req error: ' + err); });
api.get('/api/v1/server_error').expect(500).end(function (err, res) {if (err) debug('Req error: ' + err); });
*/

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai', 'fixture'],

    // list of files / patterns to load in the browser
    files: [
      'node_modules/jquery/dist/jquery.min.js',
      'node_modules/bootstrap/dist/js/bootstrap.min.js',
      'node_modules/chart.js/dist/Chart.bundle.min.js',
      'node_modules/moment/min/moment.min.js',
      'node_modules/chosen-js/chosen.jquery.js',
      'ui/plugins/datatables/datatables.min.js',
      'ui/plugins/highlightjs/highlight.pack.js',
      'ui/plugins/peity/jquery.peity.min.js',
      'ui/swsLayout.js',
      'ui/swsTable.js',
      'ui/swsuiWidget.js',
      'ui/swsuiChart.js',
      'ui/swsApiOpSel.js',
      'ui/sws.js',
      './test/ui/*.js',
      './test/ui/*.html'
    ],


    // list of files to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors:
    //      https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: appConfig.karma.preprocessors,


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: appConfig.karma.reporters,

    coverageReporter: {
          dir : 'coverage/',
          reporters: [
              { type: 'lcov' },
              { type: 'text' },
              { type: 'json' }
          ]
    },

    // web server port
    port: 9876,

    urlRoot: '/swagger-stats',

    proxies: {
        '/swagger-stats/stats': 'http://localhost:3050/swagger-stats/stats',
        '/swagger-stats/dist': 'http://localhost:3050/swagger-stats/dist',
        '/swagger-stats/logout': 'http://localhost:3050/swagger-stats/logout'
    },

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR ||
    //      config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests
    // whenever any file changes
    autoWatch: appConfig.karma.autoWatch,


    // start these browsers
    // available browser launchers:
    //  https://npmjs.org/browse/keyword/karma-launcher
    browsers: appConfig.karma.browsers,


    browserConsoleLogOptions: {
      level: 'log',
      terminal: false
    },

    browserNoActivityTimeout: 60000,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: appConfig.karma.singleRun
  });
};
