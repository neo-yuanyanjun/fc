/**
 * @file 凤巢业务端的公共层级 - 环境准备
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

    // make sure all dependencies are included
    var Deferred = require('er/Deferred');
    var util = require('./util');
    require('er');
    require('esui');
    var ajax = require('./ajax');
    var systemTimer = require('./context/systemTimer');

    /**
     * 凤巢业务端的公共层级 - 环境准备
     */
    var context = {

        /**
         * 启动环境相关的控制
         */
        start: function () {
            require('./context/er').init();
            require('./context/ajax').init();

            // Deferred错误处理
            Deferred.on('exception', function (e) {
                util.processError(e.reason);
            });

            require('./monitor').init();

            systemTimer.mark('basicInfo-start');
            var envRequest = ajax.request({
                path: 'GET/basicInfo',
                simpleAjax: true
            }).promise.done(function (response) {
                require('./context/environment').initBasicInfo(response);
                systemTimer.mark('basicInfo-finish');
            }).fail(function () {
                // unexpected failure, log it
            });

            return envRequest;
        }
    };

    // 错误处理
    window.DEBUG && (window.onerror = util.processError);

    return context;
});