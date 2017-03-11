'use strict';

var log4js = require('log4js');
var logger = log4js.getLogger('swagger-stats-example');
var express = require('express');
var apirouter = express.Router();


/**
 * @swagger
 * definitions:
 *  pet:
 *    type: object
 *    required:
 *      - id
 *      - name
 *    properties:
 *      id:
 *        type: integer
 *        format: int64
 *      name:
 *        type: string
 *      tag:
 *        type: string
 *  newPet:
 *    type: object
 *    required:
 *      - name
 *    properties:
 *      id:
 *        type: integer
 *        format: int64
 *      name:
 *        type: string
 *      tag:
 *        type: string
 *  errorModel:
 *    type: object
 *    required:
 *      - code
 *      - message
 *    properties:
 *      code:
 *        type: integer
 *        format: int32
 *      message:
 *        type: string
 */


/**
 * @swagger
 *  /pets:
 *    get:
 *      description: Returns all pets from the system that the user has access to
 *      operationId: findPets
 *      produces:
 *        - application/json
 *        - application/xml
 *        - text/xml
 *        - text/html
 *      parameters:
 *        - name: tags
 *          in: query
 *          description: tags to filter by
 *          required: false
 *          type: array
 *          items:
 *            type: string
 *          collectionFormat: csv
 *        - name: limit
 *          in: query
 *          description: maximum number of results to return
 *          required: false
 *          type: integer
 *          format: int32
 *      responses:
 *        '200':
 *          description: pet response
 *          schema:
 *            type: array
 *            items:
 *              $ref: '#/definitions/pet'
 *        default:
 *          description: unexpected error
 *          schema:
 *            $ref: '#/definitions/errorModel'
 */
apirouter.get('/pets', function (req, res) {
    console.log('API:/pets');
    res.status(500).json({code:500,message:'Not implemented'});
});



// API for tests ///////////////////////////////////////// //

/**
 * @swagger
 * /success:
 *   get:
 *     description: Test success response
 *     produces:
 *       - text/html; charset=utf-8
 *     responses:
 *       200:
 *         description: Success Response
 */
apirouter.get('/success', function (req, res) {
    res.status(200).send('OK');
});

/**
 * @swagger
 * /redirect:
 *   get:
 *     description: Test redirect response
 *     responses:
 *       302:
 *         description: Redirect Response
 */
apirouter.get('/redirect', function (req, res) {
    res.redirect('/api/v1/success');
});

/**
 * @swagger
 * /client_error:
 *   get:
 *     description: Test Client Error Response
 *     produces:
 *       - text/html; charset=utf-8
 *     responses:
 *       404:
 *         description: Not Found Response
 */
apirouter.get('/client_error', function (req, res) {
    res.status(404).send('Not found');
});

/**
 * @swagger
 * /server_error:
 *   get:
 *     description: Test Server Error Response
 *     produces:
 *       - text/html; charset=utf-8
 *     responses:
 *       500:
 *         description: Server Error Response
 */
apirouter.get('/server_error', function (req, res) {
    res.status(500).send('Server Error');
});


/**
 * @swagger
 * /tester:
 *   post:
 *     description: Test API methods and various responses
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Success Response
 *       404:
 *         description: Not Found Response
 */
apirouter.post('/tester', function (req, res) {
    res.status(500).json({status:'Request Failed'});
});


module.exports = apirouter;
