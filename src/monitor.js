/**
 * @file 凤巢业务端的公共层级 - 监控体系
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

    var context = {
        init: function () {

            // 初始化ajax监控
            // require('./monitor/ajax').init();

            return require('er/Deferred').resolved();
        }
    };

    return context;
});