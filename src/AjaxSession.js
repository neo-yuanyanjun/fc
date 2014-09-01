/**
 * @file 一次AJAX行为的执行状态类
 * 默认的ajax执行（from er.ajax）有两个特性，是我们想要提升的
 *     1. 纯粹的ajax交互，不能业务定制
 *     2. 返回结果是异步状态，串联成一个event的时候有些麻烦
 *
 * 一次AJAX行为，起于ajax请求，但是未必止于此次请求
 * 一次AJAX行为的执行状态，是有可能包含多次的ajax请求，特别是在业务方向
 *     被异步状态串联的请求被视为一次请求，不进行拆分处理
 *     so不建议在处理中自串联session自己的请求
 *         如果使用fc.ajax发送了请求，则会被认为是一次全新的AjaxSession
 *         并且此次请求并不会记入当前session内，不算它的异步时间的
 *         直接使用pipe就可以了
 *     like this:
 *         var s = require('fc/ajax').request({
 *             path: 'GET/advancedStyle'
 *         });
 *         s.done(function (res) {
 *             // do sth
 *         }).ensure(function(z){
 *             console.log('hi:', z)
 *         });
 *         s.pipe({path:'GET/basicInfo'});
 *
 * 每一次AjaxSession实例的执行，都会产生一个唯一的eventId
 * 其内部每个ajax请求的执行都会携带这个eventId
 * eventId的生存周期为实例的生存周期
 * eventId为第一个ajax请求的reqId
 *
 * ajax请求串联的方式将使用AjaxSession实例的pipe方法，为执行队列推入一个新的处理
 * 此处理将根据队列中上个处理的状态变化而进行不同的处理，没有匹配则中断队列执行
 *
 * 对于参数ajaxOptions的解读请参看meta.ajaxOptions及prepareOptions的注释
 *
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

    var _ = require('underscore');
    var eoo = require('eoo');
    var EventTarget = require('mini-event/EventTarget');
    var Deferred = require('er/Deferred');
    var erAjax = require('er/ajax');
    var util = require('./util');
    var config = require('./config/ajax');
    var status = require('./config/status');

    /**
     * AjaxQueue单个对象类
     * @class AjaxQueueItem
     * @constructor
     * @extends Deferred
     * @lends AjaxQueueItem
     * @param {meta.AjaxOption} option 请求的参数
     */
    var ajaxQueueItemProto = {};

    /**
     * 构造函数
     * @param {meta.AjaxOption=} firstOption 第一个请求的参数，可选，传递则自动入队列
     */
    ajaxQueueItemProto.constructor = function (option) {

        require('./assert').has(option);

        this.$super(arguments);

        /**
         * @property {meta.AjaxOption} [option] 请求的参数
         */
        this.option = option;

        /**
         * @property {meta.PromiseStatus} [status] 异步状态标识
         */
        this.status = status.PROMISE.INITIALIZE;

        /**
         * @property {?meta.FakeXHR} [xhr] er的xhr对象
         */
        this.xhr = null;

        /**
         * @property {boolean} [simpleAjax=false] 是否不使用业务验证，默认为false
         */
        this.simpleAjax = !!option.simpleAjax;
        option.simpleAjax && (delete option.simpleAjax);

        // 自动配置status跟随promise变化
        this.promise.then(
            function () {
                this.status = status.PROMISE.RESOLVED;
            },
            function () {
                this.status = status.PROMISE.REJECTED;
            }
        );

        // pipe方法，用于继续添加所在队列的东西
        this.pipe = null;
    };

    /**
     * 重置为pending状态
     */
    ajaxQueueItemProto.reset = function () {
        this.status = status.PROMISE.INITIALIZE;
        this.state = 'pending';
    };

    /**
     * 队列元素 - 执行请求
     */
    ajaxQueueItemProto.request = function() {

        var me = this;

        // 为请求的url补充uid，这也是为什么配置er的ajax的cache为true的原因
        // reqId是用来令请求唯一

        me.option.url = me.option.url.replace(/reqId=\w+/g, '')
            .replace(/&$/, '');

        me.option.url += (me.option.url.indexOf('?') > -1 ? '&' : '?')
            + 'reqId=' + util.uid();
        // ajax执行每次请求的url都不会携带参数`_=时间戳`
        me.option.cache = true;

        // 本次请求是否不使用业务验证

        me.xhr = erAjax.request(me.option);
        var state = me.xhr.done(_.bind(processXhrSuccess, me))  // 业务处理
            .fail(_.bind(processXhrFailure, me));  // 失败、超时、业务失败

        state.then(
            _.bind(me.resolver.resolve),
            _.bind(me.resolver.reject)
        ).then(
            /**
             * @event done
             *
             * 任意一个请求成功时触发
             */
            _.bind(me.fire, me, 'done'),
            /**
             * @event fail
             *
             * 任意一个请求失败时触发
             */
            _.bind(me.fire, me, 'fail')
        );
        return me;
    };

    require('mini-event/EventTarget').enable(ajaxQueueItemProto);
    var AjaxQueueItem = eoo.create(Deferred, ajaxQueueItemProto);

    /**
     * AjaxSession类的构造函数 & 方法 & 属性等声明
     * @class AjaxSession
     * @constructor
     * @extends mini-event.EventTarget
     * @lends AjaxSession
     */
    var proto = {};

    /**
     * 构造函数
     * @param {meta.AjaxOption=} firstOption 第一个请求的参数，可选，传递则自动入队列
     */
    proto.constructor = function (firstOption) {

        /**
         * 待处理的任务队列
         * @property {Array.<AjaxQueueItem>} [history]
         */
        this.queue = [];

        /**
         * 处理过的任务队列
         * @property {Array.<AjaxQueueItem>} [history]
         */
        this.history = [];

        /**
         * @property {?meta.Promise} [promise] 整体的异步状态
         */
        this.promise = null;

        /**
         * @property {?meta.Resolver} [resolver] 异步状态处理器
         */
        this.resolver = null;

        /**
         * 当前执行的对象，其实永远是history的最后一个
         * @property {?AjaxQueueItem} [current]
         */
        this.current = null;

        /**
         * session生存周期的eventId信息
         * @property {string} [eventId]
         */
        this.eventId = util.uid();

        firstOption && this.pipe(firstOption);
    };

    /**
     * 开始执行session，执行ajax请求
     * @return {AjaxQueueItem}
     */
    proto.start = function () {
        var me = this;

        me.fire('start', {session: me});

        // 初始化
        var state = new Deferred();
        me.promise = state.promise;
        me.resolver = state.resolver;

        me.promise.then(
            /**
             * @event done
             *
             * session成功时触发
             */
            _.bind(me.fire, me, 'done', { session: me }),
            /**
             * @event fail
             *
             * session失败时触发
             */
            _.bind(me.fire, me, 'fail', { session: me })
        );

        // 整体promise状态改变，则清空待处理的任务队列，转存入history
        me.promise.ensure(function () {
            me.history = me.history.concat(me.queue);
            me.queue = [];
            // 不重置me.current了，这时候是可以取到当前的执行的
            me.fire('finish', { session: me });
        });

        // 逻辑执行
        return processQueue.call(me);
    };

    /**
     * 重新走一遍
     * 当前redo的时候，并没有重置eventId
     * @return {AjaxQueueItem}
     */
    proto.redo = function () {
        var me = this;

        // 重置queue和history
        me.queue = [].concat(me.history, me.queue);
        me.history = [];

        // 重置待执行队列
        _.each(me.queue, function (item) {
            item.reset();
        });

        return me.start();
    };
    
    /**
     * 在请求转为`resolved`状态时，进行当前的任务队列处理
     * @param {Mixed=} response 请求返回的处理后的数据，在第一次执行的时候不存在
     */
    function processQueue(response) {
        var me = this;
        if (!me.queue || !me.queue.length) {
            // 这里搞个分支，如果初处理就是空队列，扔个错误出来
            if (response === undefined) {
                me.fire('error', {
                    error: new Error('错误的队列执行，队列为空！')
                });
            }

            // 整体结束
            return me.resolver.resolve(response);
        }
        else {
            // 首先出队列
            var current = me.queue.shift();
            // 入历史
            me.history.push(current);
            // 标记当前执行
            me.current = current;

            /**
             * @event requeststart
             * 一个请求开始时触发
             */
            me.fire('requeststart', { request: current, session: me });

            // 执行请求
            current.request();

            current.then(
                function (data) {
                    /**
                     * @event requestdone
                     *
                     * 一个请求成功时触发
                     */
                    me.fire('requestdone', {
                        request: current,
                        session: me,
                        data: data
                    });
                },
                function (data) {
                    /**
                     * @event requestfail
                     *
                     * 一个请求失败时触发
                     */
                    me.fire('requestfail', {
                        request: current,
                        session: me,
                        data: data
                    });
                }
            ).ensure(
                function (data) {
                    /**
                     * @event requestfinish
                     *
                     * 一个请求完成时触发
                     */
                    me.fire('requestfinish', {
                        request: current,
                        session: me,
                        data: data
                    });
                }
            );

            current.done(_.bind(processQueue, me))  // 成功继续执行队列
            .fail(me.resolver.reject);  // 失败终止;

            return current;
        }
    }

    /**
     * 对ajax请求的参数进行调整和适配
     * 如果配置了fc.config.ajax.url，则在请求时无需传入url，除非要请求其他的url
     * 如果指定了path，则认为是单url+path组合请求的方式
     *     此时为：url?path=path的形式
     *     如果不想使用这种组合方式，那么path应当在ajaxOption.data中传入，会认为是数据
     *
     * 每一次AjaxSession实例的执行，都会产生一个唯一的eventId
     * 其内部每个ajax请求的执行都会携带这个eventId
     * eventId的生存周期为实例的生存周期
     *
     * @param {meta.ajaxOption} ajaxOption 请求的参数
     */
    proto.prepareOptions = function (ajaxOption) {
        var option = util.deepExtend({}, config.defaultOption, ajaxOption);

        // 将传入的data转为data.params
        var newData = {
            params: JSON.stringify(option.data)
        };
        option.data = newData;

        // 如果指定了path，则认为是单url+path组合请求的方式
        // 这种模式要首先处理path……
        var spliter = (option.url.indexOf('?') > -1 ? '&' : '?');
        if (option.path) {
            option.url += spliter + 'path=' + option.path;
            // 同时会在数据中传送
            _.extend(option.data, {
                path: option.path
            });
        }

        // mark eventId
        option.data.eventId = this.eventId;

        return option;
    };

    /**
     * 关联推入一个待执行的ajax请求
     * @param {meta.ajaxOption} option 请求的参数
     */
    proto.pipe = function(option) {
        var nextQueueItem = new AjaxQueueItem(
            this.prepareOptions(option)
        );
        // 配置pipe
        nextQueueItem.pipe = _.bind(this.pipe, this);
        nextQueueItem.promise.pipe = nextQueueItem.pipe
        // 入队列
        this.queue.push(nextQueueItem);
        return nextQueueItem;
    };

    /**
     * 请求成功时触发
     * @param {Mixed} response 返回的处理后的数据
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
     * 请求失败时触发
     * @param {meta.FakeXHR|Mixed} result ajax失败为FakeXHR，业务失败为Object
     * @return {meta.AjaxFailData}
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

    var AjaxSession = eoo.create(EventTarget, proto);

    return AjaxSession;
});