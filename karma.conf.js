'use strict';

var appConfig = require('./test/karma.config');

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai', 'fixture'],
    // or can be: ['jasmine'],

      /*
       'node_modules/bootstrap/dist/css/bootstrap.min.css',
       'node_modules/font-awesome/css/font-awesome.min.css',
       'node_modules/chosen-js/chosen.css',
       'ui/plugins/datatables/datatables.min.css',
       'ui/plugins/highlightjs/github.css',
       'ui/css/sws.css',
      * */

    // list of files / patterns to load in the browser
    files: [
      'node_modules/jquery/dist/jquery.min.js',
      'node_modules/bootstrap/dist/js/bootstrap.min.js',
      'node_modules/chart.js/dist/Chart.bundle.min.js',
      'node_modules/moment/min/moment.min.js',
      'node_modules/chosen-js/chosen.jquery.js',
      'ui/plugins/datatables/datatables.min.js',
      'ui/plugins/highlightjs/highlight.pack.js',
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
          type : 'lcov',
          dir : 'coverage/'
    },

    // web server port
    port: 9876,

    proxies: {
        '/swagger-stats/stats': 'http://localhost:3040/swagger-stats/stats',
        '/dist': 'http://localhost:3040/swagger-stats/dist'
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

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: appConfig.karma.singleRun
  });
};
