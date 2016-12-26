/**
 * @file AjaxQueue单个Ajax行为类
 * 单个Ajax行为不意味着只有单个Ajax请求
 * 我们这里支持两种：
 *     1. 单个Ajax请求
 *     2. 多个并发的Ajax请求，等同于Deferred.all模式
 *
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {
    
    var _ = require('underscore');
    var eoo = require('eoo');
    var EventTarget = require('mini-event/EventTarget');
    var Deferred = require('er/Deferred');
    var erAjax = require('er/ajax');
    var status = require('../config/status');
    var util = require('../util');

    /**
     * AjaxQueue单个Ajax行为类
     * @class AjaxQueueItem
     * @constructor
     * @extends EventTarget
     * @param {Array.{meta.AjaxOption}|meta.AjaxOption} option 请求的参数
     */
    var proto = {};

    /**
     * AjaxQueue单个Ajax行为 - 构造函数
     * @param {Array.{meta.AjaxOption}|meta.AjaxOption} option 请求的参数
     */
    proto.constructor = function (option) {

        require('../assert').has(option);

        /**
         * @property {meta.AjaxOption} [option] 请求的参数
         */
        this.option = option;

        /**
         * @property {meta.PromiseStatus} [status] 异步状态标识
         */
        this.status = status.PROMISE.INITIALIZE;

        var state = new Deferred();

        /**
         * @property {meta.Promise} [promise] 当前行为的异步状态
         */
        this.promise = state.promise;

        /**
         * @property {?meta.Resolver} [resolver] 异步状态处理器
         */
        this.resolver = state.resolver;

        /**
         * @property {boolean} [isAsync] 当前是否是多个请求并发模式
         */
        this.isAsync = _.isArray(this.option);

        /**
         * @property {boolean} [simpleAjax=false] 是否不使用业务验证，默认为false
         */
        this.simpleAjax = !!option.simpleAjax;
        option.simpleAjax && (delete option.simpleAjax);

        // 配置status自动跟随promise变化
        this.promise.then(
            function () {
                this.status = status.PROMISE.RESOLVED;
            },
            function () {
                this.status = status.PROMISE.REJECTED;
            }
        );
        // 配置状态改变时的事件触发
        this.promise.then(
            /**
             * @event done
             *
             * 当前整体状态成功时触发
             */
            _.bind(this.fire, this, 'done', { request: this }),
            /**
             * @event fail
             *
             * 当前整体状态失败时触发
             */
            _.bind(this.fire, this, 'fail', { request: this })
        ).ensure(
            /**
             * @event finish
             *
             * 当前整体完成时触发
             */
            _.bind(this.fire, this, 'finish', { request: this })
        );

        // pipe方法，用于继续添加所在队列的东西
        this.pipe = null;
    };

    /**
     * AjaxQueue单个Ajax行为 - 重置状态
     */
    proto.reset = function () {
        this.status = status.PROMISE.INITIALIZE;
        this.promise = new Deferred();  // 状态重置
    };

    /**
     * AjaxQueue单个Ajax行为 - 执行请求
     */
    proto.request = function() {

        var me = this;

        /**
         * @event start
         *
         * 当前整体开始时触发
         */
        me.fire('start', { request: me });

        var newPromise;

        if (me.isAsync) {
            var stateList = [];
            _.each(me.option, function (singleOption) {
                var done = singleOption.done;
                var fail = singleOption.fail;
                if (_.isFunction(done)) {
                    delete singleOption.done;
                }
                if (_.isFunction(fail)) {
                    delete singleOption.fail;
                }
                var currState = singleRequest.call(me, singleOption);

                done && (currState = currState.done(function (response) {
                    var result = done.apply(this, arguments);
                    if (Deferred.isPromise(result)) {
                        return result;
                    }
                    else {
                        return Deferred.resolved(response);
                    }
                }));
                fail && (currState = currState.fail(function (response) {
                    var result = fail.apply(this, arguments);
                    if (Deferred.isPromise(result)) {
                        return result;
                    }
                    else {
                        return Deferred.rejected(response);
                    }
                }));

                stateList.push(currState);
            });
            newPromise = Deferred.all(stateList);
        }
        else {
            newPromise = singleRequest.call(me, me.option);
        }

        // 将newPromise和me.promise串起来
        newPromise.then(
            _.bind(me.resolver.resolve, me),
            _.bind(me.resolver.reject, me)
        );

        return me.promise;
    };

    /**
     * AjaxQueue单个Ajax行为 - 处理请求使用的option
     * 增加reqId，配置url不携带参数`_=时间戳`（被er.ajax搞出来的）
     *
     * @this {AjaxQueueItem}
     *
     * @param {meta.AjaxOption} option 请求的参数
     * @return {meta.AjaxOption}
     */
    function prepareOption(option) {

        // 为请求的url补充uid，这也是为什么配置er的ajax的cache为true的原因
        // reqId是用来令请求唯一

        option.url = option.url.replace(/reqId=\w+/g, '')
            .replace(/&$/, '');

        option.url += (option.url.indexOf('?') > -1 ? '&' : '?')
            + 'reqId=' + util.guid();
        // ajax执行每次请求的url都不会携带参数`_=时间戳`
        option.cache = true;

        return option;
    }

    /**
     * AjaxQueue单个Ajax行为 - 发送单个请求
     *
     * @this {AjaxQueueItem}
     *
     * @param {meta.AjaxOption} option 请求的参数
     * @return {meta.Promise}
     */
    function singleRequest(option) {
        var me = this;

        option = prepareOption(option);
        /**
         * @event requeststart
         * 一个请求开始时触发
         */
        me.fire('requeststart', { option: option });

        var state = erAjax.request(option)
            .done(_.bind(processXhrSuccess, me))  // 业务处理
            .fail(_.bind(processXhrFailure, me));  // 失败、超时、业务失败

        state.then(
            function (result) {
                /**
                 * @event requestdone
                 * 一个请求成功后触发
                 */
                me.fire('requestdone', { option: option, data: result });
            },
            function (result) {
                /**
                 * @event requestfail
                 * 一个请求失败后触发
                 */
                me.fire('requestfail', { option: option, data: result });
            }
        ).ensure(function () {
            /**
             * @event requestfinish
             * 一个请求结束后触发
             */
            me.fire('requestfinish', { option: option });
        });

        return state;
    }


    /**
     * AjaxQueue单个Ajax行为 - 处理ajax请求成功，进行业务验证处理
     *
     * @this {AjaxQueueItem}
     *
     * @param {Mixed} response 返回的处理后的数据
     * @return {meta.Promise}
     */
    function processXhrSuccess(response) {
        var current = this;
        // ajax请求是成功了，这时候需要进行数据分解
        try {
            // redirect通用处理
            if (response && response.redirect) {
                var toUrl = response.redirecturl|| config.redirectUrl;
                if (toUrl) {
                    require('er/locator').redirect(toUrl, { force: true });
                }
                else {
                    require('er/locator').reload();
                }

                // 发生了redirect，中断后续执行
                return Deferred.rejected({
                    isLogicFail: true,
                    status: status.REQ_CODE.REDIRECT,
                    response: response
                });
            }

            // 如果不需要业务检查，直接返回resolved
            if (current.simpleAjax) {
                return Deferred.resolved(response);
            }

            // 只有真正的成功，才能走到resolve环节
            if (response.status === status.REQ_CODE.SUCCESS) {
                return Deferred.resolved(response.data);
            }

            // 没成功，则进入processXhrFailure环节
            return Deferred.rejected({
                isLogicFail: true,
                status: response.status,
                response: response
            });
        }
        catch (e) {
            // 如果捕获到异常，是因为response的格式并非预期
            // 直接认为是CLIENT_SIDE_EXCEPTION
            // 不用fire error，因为在失败处理中会统一fire
            return Deferred.rejected({
                status: status.REQ_CODE.CLIENT_SIDE_EXCEPTION,
                error: e,
                response: response
            });
        }
    }

    /**
     * AjaxQueue单个Ajax行为 - 请求失败时触发
     *
     * @this {AjaxQueueItem}
     *
     * @param {meta.FakeXHR|Mixed} result ajax失败为FakeXHR，业务失败为Object
     * @return {meta.Promise}
     */
    function processXhrFailure(result) {

        var current = this;

        // 如果是业务失败
        if (result.isLogicFail) {
            switch (result.status) {
                // 部分失败也会被认为是失败，如果需要更新，应当用ensure处理
                // 不包括REDIRECT
                case status.REQ_CODE.PARTFAIL:
                case status.REQ_CODE.FAIL:
                case status.REQ_CODE.SERVER_ERROR:
                case status.REQ_CODE.PARAMETER_ERROR:
                case status.REQ_CODE.SERVER_EXCEEDED:
                    return Deferred.resolved(result.response);
                default:
                    return Deferred.rejected({
                        status: status.REQ_CODE.UNRECOGNIZED_STATUS,
                        desc: status.REQ_CODE_DESC.UNRECOGNIZED_STATUS,
                        response: result.response
                    });
            }
        }

        // 非业务失败
        // 先处理超时
        // HTTP 408: Request Timeout
        if (result.status == 408) {
            return Deferred.rejected({
                status: status.REQ_CODE.TIMEOUT,
                desc: status.REQ_CODE_DESC.TIMEOUT,
                response: null
            });
        }

        // 服务器返回的数据在后置处理时异常，认为请求失败，此时result.error存在
        // 并且是一个Error
        if (result.error instanceof Error) {
            // 先抛出去异常
            this.fire('error', result);
            // 再进行状态改变
            return Deferred.rejected({
                status: status.REQ_CODE.CLIENT_SIDE_EXCEPTION,
                desc: status.REQ_CODE_DESC.CLIENT_SIDE_EXCEPTION,
                response: result.responseText || result.response
            });
        }

        // 最后一种状况
        // 请求失败：HTTP status < 200 || (status >= 300 && status !== 304
        return Deferred.rejected({
            httpStatus: result.status,
            status: status.REQ_CODE.REQUEST_ERROR,
            desc: status.REQ_CODE_DESC.REQUEST_ERROR,
            response: null
        });
    }

    var AjaxQueueItem = eoo.create(EventTarget, proto);

    return AjaxQueueItem;
});