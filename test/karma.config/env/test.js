'use strict';

module.exports = {
  karma: {
    browsers: ['Chrome','Firefox'], // add more browsers i.e. Firefox, IE...
    preprocessors: {
      'ui/*.js': 'coverage',
      'test/ui/*.html' : ['html2js']
    },
    reporters: ['mocha','coverage'],
    autoWatch: false,
    singleRun: true
  }
};
