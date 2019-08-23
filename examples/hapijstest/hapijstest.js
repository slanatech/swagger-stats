'use strict';

const Hapi = require('@hapi/hapi');
const swStats = require('../../lib');    // require('swagger-stats');
const Inert = require('@hapi/inert');

const init = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return 'Hello World!';
        }
    });

    await server.register(Inert);

    await server.register({
        plugin: swStats.getHapiPlugin,
        options: {}
    });


    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();
