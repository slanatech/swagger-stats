/*
 * Created by sv2 on 3/9/17.
 *
 * SWS Test fixture
 */


module.exports = {

    // Default port for example app
    SWS_TEST_DEFAULT_PORT: '3030',

    // Default port for example app
    SWS_TEST_SPECTEST_PORT: '3040',

    // Default host for example app
    SWS_TEST_DEFAULT_HOST: 'localhost',

    // Default URL for example app
    SWS_TEST_DEFAULT_URL:   'http://localhost:3030',

    // Default URL for spectest app
    SWS_SPECTEST_DEFAULT_URL:   'http://localhost:3040',

    // API to get stats
    SWS_TEST_STATS_API:     '/swagger-stats/stats',

    // API to get metrics
    SWS_TEST_METRICS_API:   '/swagger-stats/metrics',

    // API to get metrics via app URI
    SWS_TEST_APP_METRICS_API:'/metrics',

    // Mock API
    SWS_TEST_MOCK_API:      '/api/v1/mockapi',

    // Baseline test stat fields
    SWS_TEST_BASELINE_STAT_FIELDS:  { fields: ''},

    // API to get UI
    SWS_TEST_STATS_UI:      '/swagger-stats/ui',

    // API to get resources from /dist
    SWS_TEST_STATS_DIST:    '/swagger-stats/dist',

    // API to get testing UI
    SWS_TEST_UI:            '/ui/'
};
