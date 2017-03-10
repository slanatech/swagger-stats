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
            "filename": "./examplelog",
            "pattern": "-yyyyMMdd-hh.log",
            "alwaysIncludePattern": true
        }
    ],
    "levels": {
        "swagger-stats-example": "DEBUG",
        "swagger-stats": "DEBUG"
    }
});
var logger = log4js.getLogger('swagger-stats-example');

// Express and middlewares
var express = require('express');
var expressBodyParser = require('body-parser');
var expressFavicon = require('serve-favicon');
var expressStatic = require('serve-static');

var swaggerJSDoc = require('swagger-jsdoc');

var swStats = require('../lib');    // require('swagger-stats');

// Mockup API implementation
var API = require('./api')

var app = module.exports = express();
app.use(expressFavicon(path.join(__dirname, '../ui/favicon.png')));
app.use('/ui',expressStatic(path.join(__dirname, '../ui')));
app.use('/node_modules',expressStatic(path.join(__dirname, '../node_modules')));

// all environments
app.set('port', process.env.PORT || 3030);

// Suppress cache on the GET API responses
app.disable('etag');

// SWAGGER-JSDOC Initialization //
var swOptions = {
    swaggerDefinition: {
        "info": {
            "description": "This is a Petstore API implementation for swagger-stats sample app",
            "version": "1.0.0",
            "title": "Swagger-Stats Petstore ",
            "contact": {
                "email": "sv2@slanatech.com"
            },
            "license": {
                "name": "MIT"
            }
        },
        "host": "localhost",
        "basePath": "/api/v1",
        "tags": [
            {
                "name": "pet",
                "description": "Everything about your Pets",
                "externalDocs": {
                    "description": "Find out more"
                }
            },
            {
                "name": "store",
                "description": "Access to Petstore orders"
            },
            {
                "name": "user",
                "description": "Operations about user",
                "externalDocs": {
                    "description": "Find out more about our store"
                }
            }
        ],
        "schemes": ["http"]
    },
    apis: ['./api.js']  // Path to the API files with swagger docs in comments
};

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
var swaggerSpec = swaggerJSDoc(swOptions);

// Track statistics on API request / responses
swStats.init({});
app.use(swStats.getMiddleware());

app.get('/', function(req,res) {
    res.redirect('/ui');
});

app.get('/apidoc.json', function(req,res){
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Implement custom API in application to return collected statistics
app.get('/stats', function(req,res){
    res.setHeader('Content-Type', 'application/json');
    res.send(swStats.getData());
});

// Connect API Router
app.use('/api/v1', API);

// Setup server
var server = http.createServer(app);
server.listen(app.get('port'));
logger.info('Server started on port ' + app.get('port') + ' http://localhost:'+app.get('port'));

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

