/**
 * @file 凤巢业务端的公共层级 - 监控体系 - ajax监控
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {
    var _ = require('underscore');
    var timer = require('./timer');
    var ajax = require('../ajax');
    var config = require('../config/monitor');

    var spent = {};
    var reqStack = {
        succ: [],
        fail: []
    };
    var sessionStack = [];

    function getReqId(url) {
        var query = require('er/URL').parseQuery(url.split('?')[1] || '');
        return query.reqId;
    }

    function encodeData(data) {
        return encodeURIComponent(JSON.stringify(data));
    };

    function tryDump() {
        tryDumpRequestSuccLog();
        tryDumpRequestFailLog();
        tryDumpSessionLog();
    }

    function tryDumpRequestSuccLog() {
        if (reqStack.succ.length >= config.STACK_SIZE) {
            _.each(reqStack.succ, function (item) {
                item.spent = spent[item.reqId];
            });
            require('er/ajax').log(config.monitorUrl, {
                target: 'ajaxLog',
                data: reqStack.succ
            });
        }
    }

    function tryDumpRequestFailLog() {
        if (reqStack.fail.length >= config.STACK_SIZE) {
            _.each(reqStack.succ, function (item) {
                item.spent = spent[item.reqId];
            });
            require('er/ajax').log(config.monitorUrl, {
                target: 'ajaxFail',
                data: reqStack.fail
            });
        }
    }

    function tryDumpSessionLog() {
        if (sessionStack.length >= 20) {
            require('er/ajax').log(config.monitorUrl, {
                target: 'ajaxSession',
                data: sessionStack
            });
        }
    }

    // 以下为配置

    return {
        init: function () {
            ajax.hooks.beforeEachRequest = function (option) {
                var reqId = getReqId(option.url);
                // 记录请求的耗时，使用reqId作为key
                timer.start(reqId);
            };

            ajax.hooks.afterEachRequest = function (option) {
                var reqId = getReqId(option.url);
                spent[reqId] = timer.stop(reqId);
                tryDump();
            };

            ajax.hooks.beforeEachSession = function (session) {
                // 记录请求的耗时，使用eventId作为key
                timer.start(session.eventId);
            };
            ajax.hooks.afterEachSession = function (session) {
                var logData = {
                    eventId: session.eventId,
                    spent: timer.stop(session.eventId),
                    requestList: []
                };
                _.each(session.history, function (item) {
                    var reqId = getReqId(item.option.url);
                    logData.requestList.push({
                        reqId: reqId,
                        spent: spent[reqId]
                    });
                });
                sessionStack.push(logData);
            };
            ajax.hooks.eachSuccess = function (request, data) {
                reqStack.succ.push({
                    reqId: getReqId(request.option.url),
                    eventId: request.option.data.eventId,
                    option: encodeData(request.option),
                    data: encodeData(data)
                });
            };
            ajax.hooks.eachFailure = function (request, data) {
                reqStack.fail.push({
                    reqId: getReqId(request.option.url),
                    eventId: request.option.data.eventId,
                    option: encodeData(request.option),
                    data: encodeData(data)
                });
            };
        }
    };
});