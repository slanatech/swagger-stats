'use strict';

var http = require('http');
var path = require('path');
var log4js = require('log4js');

log4js.configure({
    "appenders": [
        {
            "type": "console"
        },
        {
            "type": "dateFile",
            "filename": "./spectest",
            "pattern": "-yyyyMMdd-hh.log",
            "alwaysIncludePattern": true
        }
    ],
    "levels": {
        "swagger-stats-spectest": "DEBUG",
        "swagger-stats": "DEBUG"
    }
});
var logger = log4js.getLogger('swagger-stats-spectest');

// Express and middlewares
var express = require('express');
var expressBodyParser = require('body-parser');
var expressFavicon = require('serve-favicon');
var expressStatic = require('serve-static');

var swaggerParser = require('swagger-parser');

var swStats = require('../../lib');    // require('swagger-stats');

var app = module.exports = express();
app.use(expressFavicon(path.join(__dirname, '../../ui/favicon.png')));
app.use('/ui',expressStatic(path.join(__dirname, '../../ui')));
app.use('/node_modules',expressStatic(path.join(__dirname, '../../node_modules')));
app.use(expressBodyParser.json());
app.use(expressBodyParser.urlencoded({ extended: true }));

// all environments
app.set('port', process.env.PORT || 3030);

// Suppress cache on the GET API responses
app.disable('etag');

app.get('/', function(req,res) {
    // TODO - remove, use bundled UI
    res.redirect('/ui');
});

app.get('/apidoc.json', function(req,res){
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});


// Testing validation of 3rd-party API spec
var swaggerSpec = null;
var parser = new swaggerParser();

if(!process.env.SWS_SPECTEST_URL){
    logger.error('Swagger spec URL is not specified - set environment variable SWS_SPECTEST_URL');
    return;
}

var specLocation = process.env.SWS_SPECTEST_URL;
logger.info('Loading Swagger Spec from ' + specLocation );

parser.validate(specLocation,function(err, api) {
    if (err) {
        console.log('Error validating swagger file: ' + err);
        return;
    }else {
        console.log('Success validating swagger file!');
        swaggerSpec = api;

        // Track statistics on API request / responses
        swStats.init({swaggerSpec:swaggerSpec});
        app.use(swStats.getMiddleware());

        // Implement custom API in application to return collected statistics
        app.get('/stats', function(req,res){
            res.setHeader('Content-Type', 'application/json');
            res.send(swStats.getCoreStats());
        });

        // Setup server
        var server = http.createServer(app);
        server.listen(app.get('port'));
        logger.info('Server started on port ' + app.get('port') + ' http://localhost:'+app.get('port'));
    }
});

process.on('SIGTERM', function(){
    logger.info('Service shutting down gracefully');
    process.exit();
});

if (process.platform === 'win32') {
    require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    }).on('SIGINT', function () {
        process.emit('SIGINT');
    });
}

process.on('SIGINT', function () {
    process.exit();
});

