<p align="center">
<img src="https://github.com/slanatech/swagger-stats/blob/master/screenshots/logo-xs.png?raw=true" alt="swagger-stats"/>
</p>

# swagger-stats

[![Build Status](https://travis-ci.org/slanatech/swagger-stats.svg?branch=master)](https://travis-ci.org/slanatech/swagger-stats)
[![Dependencies](https://david-dm.org/slanatech/swagger-stats.svg)](https://david-dm.org/slanatech/swagger-stats)
[![Coverage Status](https://coveralls.io/repos/github/slanatech/swagger-stats/badge.svg?branch=master)](https://coveralls.io/github/slanatech/swagger-stats?branch=master)
[![Tested on APIs.guru](https://api.apis.guru/badges/tested_on.svg)](https://APIs.guru)
[![npm version](https://badge.fury.io/js/swagger-stats.svg)](https://badge.fury.io/js/swagger-stats)


### Telemetry for your APIs

Trace and Monitor REST API performance, health and usage statistics in node Microservices 


![swagger-stats bundled User Interface](screenshots/uiscreens.gif?raw=true)


**swagger-stats** monitors REST API requests and responses in node express apps and collects statistics.
swagger-stats detects and monitors statistics for API operations based on express routes or Swagger specification.
You may retrieve statistics using swagger-stats API, as well as you may monitor statistics using built-in UI front end. 
With data collected by swagger-stats you may spot problematic API endpoints, see where most of errors happens, 
catch long-running requests, analyze details of last errors, observe trends in requests volumes.

 
**swagger-stats** collects:
* Counts of requests and responses(total and by response class), processing time (total/avg/max), 
content length(total/avg/max) for requests and responses, rates for requests and errors. 
This is baseline set of metrics. 
* Statistics by Request Method: baseline metrics collected for each request method
* Timeline: baseline metrics collected for each 1 minute interval during last 60 minutes. Timeline helps you to analyze trends.
* Errors: count of responses per each error code, top "not found" resources, top "server error" resources
* Last errors: request and response details for the last 100 errors (last 100 error responses)
* Longest requests: request and response details for top 100 requests that took longest time to process (time to send response)
* Tracing: Request and Response details - method, URLs, parameters, request and response headers, addresses, start/stop times and processing duration, matched API Operation info
* API Statistics: baseline metrics per each API Operation. API operation is path and method combination from the swagger spec. 
Swagger specification is optional. swagger-stats will detect and monitor API operations based on express routes. 
* API Operation parameters metrics: parameter passed count, mandatory parameter missing count (for API Operation parameters defined in swagger spec)


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

See /examples for sample apps 

### Get stats with API

```
$ curl http://<your app host:port>/swagger-stats/stats
{
  "startts": 1495174617959,
  "all": {
    "requests": 247,
    "responses": 246,
    "errors": 89,
    "info": 0,
    "success": 139,
    "redirect": 18,
    "client_error": 68,
    "server_error": 21,
    "total_time": 12601,
    "max_time": 100,
    "avg_time": 51.016194331983804,
    "total_req_clength": 12760,
    "max_req_clength": 209,
    "avg_req_clength": 51,
    "total_res_clength": 25361,
    "max_res_clength": 200,
    "avg_res_clength": 102,
    "req_rate": 1.8788726763941634,
    "err_rate": 0.6715970417749351
  },
  "name": "swagger-stats-testapp",
  "version": "0.70.1",
  "nodehostname": "hostname",
  "nodename": "node-1",
  "nodeaddress": "127.0.0.1"
}
```

Get more statistics:

```
$ curl http://<host:port>/swagger-stats/stats?fields=method
$ curl http://<host:port>/swagger-stats/stats?fields=timeline
$ curl http://<host:port>/swagger-stats/stats?fields=lasterrors
$ curl http://<host:port>/swagger-stats/stats?fields=longestreq
$ curl http://<host:port>/swagger-stats/stats?fields=apidefs
$ curl http://<host:port>/swagger-stats/stats?fields=apistats
$ curl http://<host:port>/swagger-stats/stats?fields=errors
```

Get exactly what you need:

```
$ curl http://<host:port>/swagger-stats/stats?fields=method,timeline
$ curl http://<host:port>/swagger-stats/stats?fields=lasterrors,longestreq
$ curl http://<host:port>/swagger-stats/stats?fields=apiop&method=GET&path=/v2/pet/{petId}
$ curl http://<host:port>/swagger-stats/stats?fields=all
$ curl http://<host:port>/swagger-stats/stats?fields=*
```


### User Interface 

Swagger-stats comes with built-in User Interface. Navigate to /swagger-stats/ui in your app to start monitoring right away
   
```
http://<your app host:port>/swagger-stats/ui
```

##### Key metrics

![swagger-stats bundled User Interface](screenshots/summ_widgets.png?raw=true)

##### Timeline

![swagger-stats bundled User Interface](screenshots/timeline.png?raw=true)

##### Request and error rates 

![swagger-stats bundled User Interface](screenshots/rates.png?raw=true)

##### API Operations 

![swagger-stats bundled User Interface](screenshots/apitable.png?raw=true)

##### Stats By Method

![swagger-stats bundled User Interface](screenshots/methods.png?raw=true)

  

## Enhancements and Bug Reports

If you find a bug, or have an enhancement in mind please post [issues](https://github.com/slanatech/swagger-stats/issues) on GitHub.

## License
 
MIT
