# swagger-stats

Collect and monitor REST API statistics in node express app based on Swagger API specification or express routes


**swagger-stats** helps you to understand how your API processes requests. swagger-stats monitors 
requests and responses in node express app and collects statistics. You may then retrieve statistics using 
swagger-stats API, as well as you may monitor statistics using UI front end. 
With data collected by swagger-stats you may spot problematic API endpoints, see where most of errors happens, 
catch long-running requests, analyze details of last errors, observe trends in requests volumes.

 
**swagger-stats** collects these statistics:
* Counts of requests and responses(total and by response class), processing time (total/avg/max), 
content length(total/avg/max) for requests and responses, rates or requests and errors. 
This is baseline set of metrics. 
* Statistics by Request Method: baseline metrics collected for each request method
* Timeline: baseline metrics collected for each 1 minute interval during last 60 minutes. Timeline helps you to analyze trends.
* Errors: count of responses per each error code, top "not found" resources, top "server error" resources
* Last errors: request and response details for the last 100 errors (last 100 error responses)
* Longest requests: request and response details for top 100 requests that took longest time to process (time to send response)
* API Statistics: baseline metrics per each API Operation. API operation is path and method combination from the swagger spec. 
Note that swagger specification is not mandatory. If swagger specification is not provided, swagger-stats will 
detect and monitor API operations based on express route path. 
* API Operation parameters metrics: parameter passed count, mandatory parameter missing count (for API Operation parameters defined in swagger spec)




### Install 

```
npm install swagger-stats --save
```

### Enable

```javascript
var swStats = require('swagger-stats');

var app = module.exports = express();

var swaggerSpec = require('swagger.json');

// Enable swagger-stats middleware
app.use(swStats.getMiddleware({
    name: 'swagger-stats-testapp',
    version: '0.70.1',
    swaggerSpec:swaggerSpec
}));
```
See /examples

### Monitor

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

Try also:

```
$ curl http://<your app host:port>/swagger-stats/stats?fields=method
$ curl http://<your app host:port>/swagger-stats/stats?fields=timeline
$ curl http://<your app host:port>/swagger-stats/stats?fields=lasterrors
$ curl http://<your app host:port>/swagger-stats/stats?fields=longestreq
$ curl http://<your app host:port>/swagger-stats/stats?fields=apidefs
$ curl http://<your app host:port>/swagger-stats/stats?fields=apistats
$ curl http://<your app host:port>/swagger-stats/stats?fields=errors
$ curl http://<your app host:port>/swagger-stats/stats?fields=all
```

Or combination:

```
$ curl http://<your app host:port>/swagger-stats/stats?fields=method,timeline
$ curl http://<your app host:port>/swagger-stats/stats?fields=all
$ curl http://<your app host:port>/swagger-stats/stats?fields=*
```


### User Interface 
   
```
http://<your app host:port>/swagger-stats/ui
```

![swagger-stats bundled User Interface](screenshots/uiscreens.gif?raw=true)
