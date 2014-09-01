/**
 * @file 凤巢业务端的公共层级 - 权限准备
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {
    
    var Deferred = require('er/Deferred');
    var ajax = require('./ajax');

    /**
     * 凤巢业务端的公共层级 - 权限控制
     */
    var auth = {

        /**
         * 启动权限控制
         */
        start: function () {
            return Deferred.resolved();
        }
    };

    return auth;
});