'use strict';

module.exports = {
  karma: {
    browsers: ['PhantomJS'],
    preprocessors: {
      'ui/*.js': 'coverage',
      'test/ui/*.html' : ['html2js']
    },
    reporters: ['mocha','coverage'],
    autoWatch: false,
    singleRun: true
  }
};
