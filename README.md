# swagger-stats

Collect and monitor REST API statistics in node express app based on Swagger API specification or express routes
    
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

![swagger-stats bundled User Interface](screenshots/ui.png?raw=true)
