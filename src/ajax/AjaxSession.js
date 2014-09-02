/**
 * @file 一连串AJAX行为的执行状态类
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
    var miniEvent = require('mini-event');
    var EventTarget = require('mini-event/EventTarget');
    var Deferred = require('er/Deferred');
    var util = require('../util');
    var config = require('../config/ajax');
    var AjaxQueueItem = require('./AjaxQueueItem');

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
     * @param {Array.<meta.AjaxOption> | meta.AjaxOption=} firstOption
     *     第一个请求的参数，可选，传递则自动入队列
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
        me.promise.pipe = _.bind(me.pipe, me);
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
        processQueue.call(me);

        return me;
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
     * 代理事件时的默认参数
     * @type {Object}
     */
    var DELEGATE_PARAM = {
        preserveData: true,
        syncState: true
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
            miniEvent.delegate(
                current, 'requeststart', me, 'requeststart', DELEGATE_PARAM
            );

            /**
             * @event requestdone
             * 一个请求成功时触发
             */
            miniEvent.delegate(
                current, 'requestdone', me, 'requestdone', DELEGATE_PARAM
            );

            /**
             * @event requestfail
             * 一个请求失败时触发
             */
            miniEvent.delegate(
                current, 'requestfail', me, 'requestfail', DELEGATE_PARAM
            );
            
            /**
             * @event requestfinish
             * 一个请求完成时触发
             */
            miniEvent.delegate(
                current, 'requestfinish', me, 'requestfinish', DELEGATE_PARAM
            );

            /**
             * @event queueitemstart
             * 一个队列中的单项开始时触发
             */
            miniEvent.delegate(
                current, 'start', me, 'queueitemstart', DELEGATE_PARAM
            );

            /**
             * @event queueitemfinish
             * 一个队列中的单项完成时触发
             */
            miniEvent.delegate(
                current, 'finish', me, 'queueitemfinish', DELEGATE_PARAM
            );

            /**
             * @event queueitemdone
             * 一个队列中的单项成功时触发
             */
            miniEvent.delegate(
                current, 'done', me, 'queueitemdone', DELEGATE_PARAM
            );

            /**
             * @event queueitemfail
             * 一个队列中的单项失败时触发
             */
            miniEvent.delegate(
                current, 'fail', me, 'queueitemfail', DELEGATE_PARAM
            );

            // 执行请求
            current.request().done(function () {  // 成功继续执行队列
                return processQueue.apply(me, arguments);
            }).fail(me.resolver.reject);  // 失败终止;

            return current.promise;
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
     * @param {Array.<meta.ajaxOption> | meta.ajaxOption} ajaxOption 请求的参数
     * @return {Array.<meta.ajaxOption> | meta.ajaxOption}
     */
    proto.prepareOptions = function (ajaxOption) {

        var me = this;

        if (_.isArray(ajaxOption)) {
            _.each(ajaxOption, function (singleOption, index) {
                ajaxOption[index] = prepareSingleOption.call(me, singleOption);
            });
        }
        else {
            ajaxOption = prepareSingleOption.call(me, ajaxOption);
        }

        return ajaxOption;
    };

    /**
     * 真正的`单个`请求的参数的处理方法
     * @param {meta.ajaxOption} option 请求的参数
     * @return {meta.ajaxOption}
     */
    function prepareSingleOption(option) {
        option = util.deepExtend({}, config.defaultOption, option);

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
    }

    /**
     * 关联推入一个待执行的ajax请求
     * @param {Array.<meta.ajaxOption> | meta.ajaxOption} option 请求的参数
     */
    proto.pipe = function(option) {
        var nextQueueItem = new AjaxQueueItem(
            this.prepareOptions(option)
        );
        // 配置pipe
        nextQueueItem.pipe = _.bind(this.pipe, this);
        nextQueueItem.promise.pipe = nextQueueItem.pipe;
        // 入队列
        this.queue.push(nextQueueItem);
        return nextQueueItem.promise;
    };

    var AjaxSession = eoo.create(EventTarget, proto);

    return AjaxSession;
});