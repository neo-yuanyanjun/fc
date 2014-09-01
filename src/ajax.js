/**
 * @file 凤巢业务端的公共层级 - AJAX
 * from extendedAjax
 * ajax是一个单例，但是同时提供ajax.Ajax类的引用
 *
 * ajax提供一个封装好的ajax行为触发类的实例
 * 使用模式：
 *     使用fc.ajax.request发送ajax请求，由此触发了一次ajax行为，返回一个AjaxSession实例
 *     AjaxSession实例的生存周期为此实例的异步状态转为`resolved`或`rejected`
 *     无需手动控制，仅靠异步状态触发后续行为
 *     后续行为交给AjaxSession实例继续进行
 *     具体AjaxSession的特性可参见 {@link ActionSession}
 *
 * ajax.config 基础配置 实际上就是er.ajax的配置
 *
 * ajax.hooks 钩子们，钩子必须通过ajax.request或者ajax.session才能关联上
 *     beforeEachRequest 在执行任意请求以前被调用
 *     afterEachRequest 在执行任意请求之后被调用
 *     beforeEachSession 在一个{@link AjaxSession}开始执行之前调用
 *     afterEachSession 在一个{@link AjaxSession}彻底结束之后调用
 *     eachSuccess 在任意ajax经过数据分析后认为是成功后调用
 *     eachFailure 在任意ajax经过数据分析后认为是失败后调用
 *
 * 使用实例：
 *     ajax.request({
 *         path: 'vega/GET/mtl/wordlist',
 *         data: 'vega/GET/mtl/wordlist',
 *     })
 *
 * @requires module:er/ajax
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

    var _ = require('underscore');
    var eoo = require('eoo');
    var EventTarget = require('mini-event/EventTarget');
    var AjaxSession = require('./AjaxSession');

    var noop = function () {};

    /**
     * @class Ajax
     * Ajax类
     * @constructor
     * @extends mini-event.EventTarget
     * @lends Ajax
     */
    var proto = {};

    /**
     * 构造函数
     * @constructor
     */
    proto.constructor = function () {

        /**
         * ajax.config
         * @type {meta.AjaxConfig}
         */
        this.config = require('./config/ajax');

        /**
         * 钩子们
         * @type {meta.AjaxHook}
         */
        this.hooks = {
            beforeEachRequest: noop,
            afterEachRequest: noop,
            eachSuccess: noop,
            eachFailure: noop,
            beforeEachSession: noop,
            afterEachSession: noop
        };
    };

    /**
     * 发送请求，每次ajax.request执行都触发一个新的AjaxSession
     * 返回的是AjaxSession的实例
     *
     * @param {meta.ajaxOption} ajaxOption 请求的参数
     * @return {AjaxSession}
     */
    proto.request = function (ajaxOption) {
        try {
            var session = this.session(ajaxOption);
            session.start();
            return session.current;
        }
        catch (e) {
            this.fire('error', {
                error: e
            });
        }
    };

    /**
     * 生成一个AjaxSession，需要手动执行start
     * @param {meta.ajaxOption} ajaxOption 第一个请求的参数
     * @return {AjaxSession}
     */
    proto.session = function (ajaxOption) {
        var me = this;
        try {
            var session = new AjaxSession(ajaxOption);

            require('mini-event/Event').delegate(
                session, 'error', me, 'error', {
                preserveData: true
            });

            session.on('start', function (e) {
                me.hooks.beforeEachSession(e.session);
            });
            session.on('requestdone', function (e) {
                me.hooks.eachSuccess(e.request, e.data)
            });
            session.on('requestfail', function (e) {
                me.hooks.eachFailure(e.request, e.data);
            });
            session.on('requestfinish', function (e) {
                me.hooks.afterEachRequest(e.request.option);
            });
            session.on('finish', function (e) {
                me.hooks.afterEachSession(e.session);
            });

        }
        catch (e) {
            me.fire('error', {
                error: e
            });
        }
        return session;
    };

    /**
     * 并行的多个请求
     * @param {Array.<meta.ajaxOption>} options 请求的参数数组
     * @return {Deferred}
     */
    proto.all = function (options) {
        if (!_.isArray(options)){
            return this.request(options);
        }
        
    };

    var Ajax = eoo.create(EventTarget, proto);
    var instance = new Ajax();
    instance.Ajax = Ajax;

    require('er/ajax').hooks.beforeExecute = function (option) {
        instance.hooks.beforeEachRequest(option);
    };

    return instance;
});