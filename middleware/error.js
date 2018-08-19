const errorMsg = require('./../configs/errors');
// 统一错误处理中间件
module.exports = function(err, req, res, next) {
    var result = {
        success: false
    };
    if (err.code && (app.tool._.isNumber(err.code) || app.tool._.isString(err.code))) {
        result.error = {
            "code": err.code,
            "msg": errorMsg[err.code] || errorMsg['4000']
        }
    } else {
        result.error = {
            "code": 4000,
            "msg": errorMsg['4000']
        }
    }
    res.sws.error = err;
    res.status(403)
    res.json(result);
}