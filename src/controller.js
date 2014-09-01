/**
 * @file 凤巢业务端的公共层级 - 主控制器
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

    // var _ = require('underscore');
    // var Deferred = require('er/Deferred');
    // var auth = ;

    /**
     * 凤巢业务端的公共层级 - 主控制器
     */
    var controller = {

        /**
         * 启动整个公共层控制
         * 此方法按顺序启动，执行基于ER的Deferred异步状态
         */
        start: function () {
            require('./context').start()  // 环境准备
            .done(function () {
                return require('./auth').start();  // 权限准备
            })
            .done(function () {
                require('er/controller').registerAction(
                    require('./config/er').actionConf
                );

                require('er').start();  // 环境执行，er开始监听
                require('./context/systemTimer').mark('er-started');
            })
            .fail(function (e) {
                if (e instanceof Error) {
                    console.error(e.stack);
                }
            })
            .ensure(function () {
                require('./context/systemTimer').mark('fc-finish');
            });
        }
    };

    return controller;
});