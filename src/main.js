/**
 * FC (FengChao Framework)
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @ignore
 * @file 凤巢业务端的公共层级 - 主入口
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

    var _ = require('underscore');
    var util = require('./util');
    require('./context/systemTimer').mark('fc-start');

    /**
     * @class fc
     *
     * 主模块
     *
     * @singleton
     */
    var fc = {
        /**
         * 当前版本号
         *
         * @type {string}
         */
        version: '0.0.1-alpha.1',

        /**
         * 启动启动整个公共层控制
         * 此方法按顺序启动，执行基于ER的Deferred异步状态
         */
        start: function () {
            try {
                var actionConf = _.flatten(require('./config/er').actionConf);
                if (_.isArray(actionConf) && actionConf.length > 0) {
                    require('./config/er').actionConf = actionConf;
                    return require('./controller').start();
                }
            }
            catch (e) {
                // hard break
                // 全局初始化发生了异常，啥都不用干了
                console.error && console.error(e.stack);
                return;
            }
            throw new Error('必须调用fc.setActionConf初始化er的action定义配置！');
        },

        /**
         * 设置er的ActionConf的定义配置
         * 随意数组层级嵌套，不需要手动打平为一层数组
         */
        setActionConf: function (value) {
            require('./config/er').actionConf = value;
            return fc;
        }
    };

    fc.onerror = util.errorHandler;

    require('mini-event/EventTarget').enable(fc);

    return fc;
});