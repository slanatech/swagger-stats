'use strict';

var log4js = require('log4js');
var logger = log4js.getLogger('swagger-stats-example');
var express = require('express');
var apirouter = express.Router();

/**
 * @swagger
 * /api/v1/test/{username}:
 *   get:
 *     description: Test the application
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: Username to use for login.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: login
 */
apirouter.get('/v1/test/:username', function (req, res) {
    console.log('API:/v1/test/:username');
    res.status(200).json({status:'OK'});
});


module.exports = apirouter;
