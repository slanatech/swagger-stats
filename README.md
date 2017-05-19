# swagger-stats

Collect and monitor REST API statistics in node express app based on Swagger API specification or express routes
    
###Install 

```
npm install swagger-stats --save
```

###Enable

```javascript
var swStats = require('swagger-stats');

var app = module.exports = express();

var swaggerSpec = require('swagger.json');

// Enable swagger-stats middleware
app.use(swStats.getMiddleware({
    name: 'swagger-stats-test',
    version: '0.70.1',
    swaggerSpec:swaggerSpec
}));
```


###Monitor



###User Interface 
 
 

