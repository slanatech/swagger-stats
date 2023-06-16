# Changelog
All notable changes to this project will be documented in this file.

## v0.99.7

* [bug] Remove DEBUG env override [#245](https://github.com/slanatech/swagger-stats/issues/271)


## v0.99.6

Dependencies updated

* [bug] Unit tests failing [#245](https://github.com/slanatech/swagger-stats/issues/245)


## v0.99.5

Dependency on deprecated `request` has been removed, `axios` is used instead

* [improvement] Replace deprecated dependency on request [#148](https://github.com/slanatech/swagger-stats/issues/148)


## v0.99.4

* [bug] api_index_template.json is missing in the last patch [#238](https://github.com/slanatech/swagger-stats/issues/238) 


## v0.99.3

* Update dependencies to the most recent versions 


## v0.99.2

* [bug] API Responses page in built-in Telemetry UI is not responding with ~1000 endpoints  [#139](https://github.com/slanatech/swagger-stats/issues/139)


## v0.99.1

In this major release, swagger-stats fully switches to new UX. More UX settings added, such as multiple color themes for dashboards.  

* [bug] Hapi - authentication is not working [#109](https://github.com/slanatech/swagger-stats/issues/109)
* [bug] Missing requests in metrics [#105](https://github.com/slanatech/swagger-stats/issues/105)
* [bug] Issue during installation of swagger stats [#100](https://github.com/slanatech/swagger-stats/issues/100)
* [bug] Authentication does not protect the new UI [#93](https://github.com/slanatech/swagger-stats/issues/93)
* [feature] Any way to change swagger-stats ui page title [#44](https://github.com/slanatech/swagger-stats/issues/44)
  Starting from 0.99.1 page title shows what is passed in the "name" configuration option of swagger-stats
  

## v0.95.19

* [bug] Elasticsearch - Crash when elasticsearch's credentials are given [#121](https://github.com/slanatech/swagger-stats/issues/121)
* [bug] Define prom-client as Peer Dependency instead of Direct Dependency [#126](https://github.com/slanatech/swagger-stats/issues/126)
* [feature] https elasticsearch support [#130](https://github.com/slanatech/swagger-stats/issues/130)


## v0.95.18

* [bug] body response show duplicate data [#118](https://github.com/slanatech/swagger-stats/issues/118)

swagger-stats now support data type flattened available in ES 7.X for body of the requests. This way we can store any body payload, and query it efficiently in ES.
https://www.elastic.co/guide/en/elasticsearch/reference/current/flattened.html#flattened

* [bug] Reduce package size for NPM [#119](https://github.com/slanatech/swagger-stats/issues/119)
* [feature] Add 30x statuses as satisfied apdex requests [#107](https://github.com/slanatech/swagger-stats/issues/107)


## v0.95.17

* [feature] Add authentication to /swagger-stats/ux URL [#97](https://github.com/slanatech/swagger-stats/issues/97)
* [feature] Allow passing of hapi specific options [#95](https://github.com/slanatech/swagger-stats/issues/95)
* [bug] append basePath on setCookie [#92](https://github.com/slanatech/swagger-stats/issues/92)

## v0.95.16

* [bug] UX paths are not properly resolved [#91](https://github.com/slanatech/swagger-stats/issues/91)
* [feature] Restify support [#86](https://github.com/slanatech/swagger-stats/issues/86)
* [bug] Natives package has been deprecated - removed [#81](https://github.com/slanatech/swagger-stats/issues/81)
* [bug] openapi3 basePath was removed [#81](https://github.com/slanatech/swagger-stats/issues/84)
New option `basePath` allows to specify base path as needed when Openapi 3.0 spec is used.


## v0.95.15

* [feature] New User eXperience is enabled at `/swagger-stats/ux`  
New UX is optional and can be used in parallel with leagcy UI. 
Will keep it optional for several releases, and then make default. 
Send your feedback !


## v0.95.11

* [feature] Support for Fastify Framework [#62](https://github.com/slanatech/swagger-stats/issues/62)


## v0.95.10

* [bug] Duration buckets not being used for Prometheus [#72](https://github.com/slanatech/swagger-stats/issues/72)
* [feature] Share promClient with parent by exposing or using peerDependencies [#61](https://github.com/slanatech/swagger-stats/issues/61)
* [feature] Prefix metrics on /metrics endpoint [#50](https://github.com/slanatech/swagger-stats/issues/50)


## v0.95.9

* [bug] Removed dependency on Inert when using with Hapi [#79](https://github.com/slanatech/swagger-stats/issues/79)


## v0.95.8

* [feature] Hapijs support [#75](https://github.com/slanatech/swagger-stats/issues/75) - [Example how to use](https://github.com/slanatech/swagger-stats/blob/master/examples/hapijstest/hapijstest.js)
 
* [feature] Koa support [#70](https://github.com/slanatech/swagger-stats/pull/70), [#67](https://github.com/slanatech/swagger-stats/issues/67) - thank you @gombosg!

## v0.95.7

* [bug] Fixes error in body stringification [#59](https://github.com/slanatech/swagger-stats/issues/59), [#60](https://github.com/slanatech/swagger-stats/pull/60)

* [bug] Cannot upload to elk and Built-In API Telemetry [#46](https://github.com/slanatech/swagger-stats/issues/46)

* [feature] Option `elasticsearchIndexPrefix`  [#45](https://github.com/slanatech/swagger-stats/issues/45),[#47](https://github.com/slanatech/swagger-stats/issues/47)


## v0.95.6

* [bug] Last Errors and Errors tab no populated using FeatherJS [#42](https://github.com/slanatech/swagger-stats/issues/42)

* [bug] Request Content Length null or undefined [#40](https://github.com/slanatech/swagger-stats/issues/40)

## v0.95.5

* [feature] Allow onAuthenticate to be asynchronous [#31](https://github.com/slanatech/swagger-stats/issues/31)  

* [feature] Prevent tracking of specific routes [#36](https://github.com/slanatech/swagger-stats/issues/36)  

* [feature] Support for extracting request body [#38](https://github.com/slanatech/swagger-stats/issues/38)   
Thanks to [DavisJaunzems](https://github.com/DavisJaunzems)!

## v0.95.0

* [feature] Elasticsearch support [#12](https://github.com/slanatech/swagger-stats/issues/12)  

*swagger-stats* now supports storing details about each API Request/Response in [Elasticsearch](https://www.elastic.co/), so you may use [Kibana](https://www.elastic.co/products/kibana) to perform analysis of API usage over time, build visualizations and dashboards.
Example Kibana dashboards provided in `dashboards/elastic6`

## v0.94.0

* [feature] Apdex score [#10](https://github.com/slanatech/swagger-stats/issues/10)  

* [feature] Support Authentication for /stats and /metrics [#14](https://github.com/slanatech/swagger-stats/issues/14)

* [feature] Add label "code" to Prometheus histogram metrics [#21](https://github.com/slanatech/swagger-stats/issues/21)

See updated dashboard at [Grafana Dashboards](https://grafana.com/dashboards/3091) 


## v0.93.1

* [bug] Can't start on node v7.10.1, Mac Os 10.12.6 [#22](https://github.com/slanatech/swagger-stats/issues/22)  

## v0.93.0

* [feature] Support providing Prometheus metrics via [prom-client](https://www.npmjs.com/package/prom-client) library [#20](https://github.com/slanatech/swagger-stats/issues/20)  

## v0.92.0

* [feature] OnResponseFinish hook: pass request/response record to callback so app can post proceses it add it to the log [#5](https://github.com/slanatech/swagger-stats/issues/5)  

## v0.91.0

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

## v0.90.3

* [feature] Added new chart to API Operation Page [#16](https://github.com/slanatech/swagger-stats/issues/16)                                                   
    - handle time histogram
    - request size histogram
    - response size histogram
    - response codes counts  

## v0.90.2

* [feature] Added [Prometheus](https://prometheus.io/) metrics and [Grafana](https://grafana.com/) dashboards [#9](https://github.com/slanatech/swagger-stats/issues/9)
  

## v0.90.1

* [feature] Added CPU and Memory Usage Stats and monitoring in UI [#8](https://github.com/slanatech/swagger-stats/issues/8)  
