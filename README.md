<p align="center">
<img src="https://github.com/slanatech/swagger-stats/blob/master/screenshots/logo-c-ssm.png?raw=true" alt="swagger-stats"/>
</p>

# swagger-stats


####  [http://swaggerstats.io](http://swaggerstats.io) | [Documentation](http://swaggerstats.io/docs.html) | [API DOC](http://swaggerstats.io/apidoc.html) | [API SPEC](http://swaggerstats.io/sws-api-swagger.yaml)

[![Build Status](https://travis-ci.org/slanatech/swagger-stats.svg?branch=master)](https://travis-ci.org/slanatech/swagger-stats)
[![Dependencies](https://david-dm.org/slanatech/swagger-stats.svg)](https://david-dm.org/slanatech/swagger-stats)
[![Coverage Status](https://coveralls.io/repos/github/slanatech/swagger-stats/badge.svg?branch=master&dummy)](https://coveralls.io/github/slanatech/swagger-stats?branch=master&dummy)
[![Tested on APIs.guru](https://api.apis.guru/badges/tested_on.svg)](https://APIs.guru)
[![npm version](https://badge.fury.io/js/swagger-stats.svg)](https://badge.fury.io/js/swagger-stats)



## API Telemetry and APM

> Trace API calls and Monitor API performance, health and usage statistics in Node.js Microservices

**swagger-stats** traces REST API requests and responses in Node.js Microservices, and collects statistics per API Operation.
**swagger-stats** detects API operations based on express routes. You may also provide [Swagger (Open API) specification](https://swagger.io/specification/), 
and swagger-stats will match API requests with API Operations defined in swagger specification. 


**swagger-stats** exposes statistics and metrics per API Operation, such as `GET /myapi/:parameter`, or `GET /pet/{petId}`
 
       
### API Analytics with [Elasticsearch](https://www.elastic.co/) and [Kibana](https://www.elastic.co/products/kibana)

> **swagger-stats** stores details about each request/response in [Elasticsearch](https://www.elastic.co/), so you may use [Kibana](https://www.elastic.co/products/kibana) 
> to perform detailed analysis of API usage over time, build visualizations and dashboards


![swagger-stats Kibana Dashboard](screenshots/kibana.gif?raw=true)

See `dashboards/elastic6` for swagger-stats Kibana visualizations and dashboards
 

### Monitoring and Alerting with [Prometheus](https://prometheus.io/) and [Grafana](https://grafana.com/)

> **swagger-stats** exposes metrics in [Prometheus](https://prometheus.io/) format, so you may use [Prometheus](https://prometheus.io/) and [Grafana](https://grafana.com/) to setup API monitoring and alerting


![swagger-stats Prometheus Dashboard](screenshots/prometheus-dashboard-2-sm.png?raw=true)


See `dashboards/prometheus` for swagger-stats Grafana dashboards 


### Built-In API Telemetry 

> **swagger-stats** provides built-in Telemetry UI, so you may enable **swagger-stats** in your app, and start monitoring immediately, with no infrastructure requirements.
> Navigate to `http://<your app host:port>/swagger-stats/ui`   


![swagger-stats Built-In Monitoring](screenshots/ui0950.gif?raw=true)


With statistics and metrics exposed by **swagger-stats** you may spot problematic API endpoints, see where most of errors happens, 
catch long-running requests, analyze details of last errors, observe trends, setup alerting. 

 
**swagger-stats** provides:
* Metrics in [Prometheus](https://prometheus.io/) format, so you may use [Prometheus](https://prometheus.io/) and [Grafana](https://grafana.com/) to setup API monitoring and alerting
* Storing details about each API Request/Response in [Elasticsearch](https://www.elastic.co/), so you may use [Kibana](https://www.elastic.co/products/kibana) to perform analysis of API usage over time, build visualizations and dashboards  
* Built-in API Telemetry UI, so you may enable swagger-stats in your app, and start monitoring right away, with no additional tools required
* Exposing collected statistics via API, including:
* Counts of requests and responses(total and by response class), processing time (total/avg/max), 
content length(total/avg/max) for requests and responses, rates for requests and errors. 
This is baseline set of stats. 
* Statistics by Request Method: baseline stats collected for each request method
* Timeline: baseline stats collected for each 1 minute interval during last 60 minutes. Timeline helps you to analyze trends.
* Errors: count of responses per each error code, top "not found" resources, top "server error" resources
* Last errors: request and response details for the last 100 errors (last 100 error responses)
* Longest requests: request and response details for top 100 requests that took longest time to process (time to send response)
* Tracing: Request and Response details - method, URLs, parameters, request and response headers, addresses, start/stop times and processing duration, matched API Operation info
* API Statistics: baseline stats and parameter stats per each API Operation. API operation detected based on express routes, and based on [Swagger (Open API) specification](https://swagger.io/specification/) 
* CPU and Memory Usage of Node process


## How to Use 


### Install 

```
npm install swagger-stats --save
```

### Enable swagger-stats middleware in your app

```javascript
var swStats = require('swagger-stats');
var apiSpec = require('swagger.json');
app.use(swStats.getMiddleware({swaggerSpec:apiSpec}));
```

See `/examples` for sample apps 

### Get Statistics with API


```
$ curl http://<your app host:port>/swagger-stats/stats
{
  "startts": 1501647865959,
  "all": {
    "requests": 7,
    "responses": 7,
    "errors": 3,
    "info": 0,
    "success": 3,
    "redirect": 1,
    "client_error": 2,
    "server_error": 1,
    "total_time": 510,
    "max_time": 502,
    "avg_time": 72.85714285714286,
    "total_req_clength": 0,
    "max_req_clength": 0,
    "avg_req_clength": 0,
    "total_res_clength": 692,
    "max_res_clength": 510,
    "avg_res_clength": 98,
    "req_rate": 1.0734549915657108,
    "err_rate": 0.4600521392424475
  },
  "sys": {
    "rss": 59768832,
    "heapTotal": 36700160,
    "heapUsed": 20081776,
    "external": 5291923,
    "cpu": 0
  },
  "name": "swagger-stats-testapp",
  "version": "0.90.1",
  "hostname": "hostname",
  "ip": "127.0.0.1"
}
```

Take a look at [Documentation](http://swaggerstats.io/docs.html#api) for more details on API and returned statistics.


### Get Prometheus Metrics 


```
$ curl http://<your app host:port>/swagger-stats/metrics
# HELP api_all_request_total The total number of all API requests received
# TYPE api_all_request_total counter
api_all_request_total 88715
# HELP api_all_success_total The total number of all API requests with success response
# TYPE api_all_success_total counter
api_all_success_total 49051
# HELP api_all_errors_total The total number of all API requests with error response
# TYPE api_all_errors_total counter
api_all_errors_total 32152
# HELP api_all_client_error_total The total number of all API requests with client error response
# TYPE api_all_client_error_total counter
api_all_client_error_total 22986

. . . . . . . . . .  

```


### Embedded Monitoring User Interface 

Swagger-stats comes with built-in User Interface. Navigate to `/swagger-stats/ui` in your app to start monitoring right away
   
```
http://<your app host:port>/swagger-stats/ui
```

##### Key metrics

![swagger-stats bundled User Interface](screenshots/metrics.png?raw=true)

##### Timeline

![swagger-stats bundled User Interface](screenshots/timeline.png?raw=true)

##### Request and error rates 

![swagger-stats bundled User Interface](screenshots/rates.png?raw=true)

##### API Operations 

![swagger-stats bundled User Interface](screenshots/apitable.png?raw=true)

##### Stats By Method

![swagger-stats bundled User Interface](screenshots/methods.png?raw=true)


## Updates 

#### v0.95.5

* [feature] Allow onAuthenticate to be asynchronous [#31](https://github.com/slanatech/swagger-stats/issues/31)  

* [feature] Prevent tracking of specific routes [#36](https://github.com/slanatech/swagger-stats/issues/36)  

* [feature] Support for extracting request body [#38](https://github.com/slanatech/swagger-stats/issues/38)   
Thanks to [DavisJaunzems](https://github.com/DavisJaunzems)!


#### v0.95.0

* [feature] Elasticsearch support [#12](https://github.com/slanatech/swagger-stats/issues/12)  

*swagger-stats* now supports storing details about each API Request/Response in [Elasticsearch](https://www.elastic.co/), so you may use [Kibana](https://www.elastic.co/products/kibana) to perform analysis of API usage over time, build visualizations and dashboards.
Example Kibana dashboards provided in `dashboards/elastic6`


#### v0.94.0

* [feature] Apdex score [#10](https://github.com/slanatech/swagger-stats/issues/10)  

* [feature] Support Authentication for /stats and /metrics [#14](https://github.com/slanatech/swagger-stats/issues/14)

* [feature] Add label "code" to Prometheus histogram metrics [#21](https://github.com/slanatech/swagger-stats/issues/21)

See updated dashboard at [Grafana Dashboards](https://grafana.com/dashboards/3091) 



#### v0.93.1

* [bug] Can't start on node v7.10.1, Mac Os 10.12.6 [#22](https://github.com/slanatech/swagger-stats/issues/22)  

#### v0.93.0

* [feature] Support providing Prometheus metrics via [prom-client](https://www.npmjs.com/package/prom-client) library [#20](https://github.com/slanatech/swagger-stats/issues/20)  


#### v0.92.0

* [feature] OnResponseFinish hook: pass request/response record to callback so app can post proceses it add it to the log [#5](https://github.com/slanatech/swagger-stats/issues/5)  


#### v0.91.0

* [feature] Option to specify alternative URI path for ui,stats and metrics  [#17](https://github.com/slanatech/swagger-stats/issues/17)

```javascript
app.use(swStats.getMiddleware({
   uriPath: '/myservice',
   swaggerSpec:swaggerSpec
}));
```
```
$ curl http://<your app host:port>/myservice/stats
```

#### v0.90.3

* [feature] Added new chart to API Operation Page [#16](https://github.com/slanatech/swagger-stats/issues/16)                                                   
    - handle time histogram
    - request size histogram
    - response size histogram
    - response codes counts  

#### v0.90.2

* [feature] Added [Prometheus](https://prometheus.io/) metrics and [Grafana](https://grafana.com/) dashboards [#9](https://github.com/slanatech/swagger-stats/issues/9)
  

#### v0.90.1

* [feature] Added CPU and Memory Usage Stats and monitoring in UI [#8](https://github.com/slanatech/swagger-stats/issues/8)  


## Enhancements and Bug Reports

If you find a bug, or have an enhancement in mind please post [issues](https://github.com/slanatech/swagger-stats/issues) on GitHub.

## License
 
MIT
