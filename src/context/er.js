/**
 * @file 环境准备 - ER
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

    var _ = require('underscore');

    /**
     * 环境准备 - ER
     */
    var erContext = {
        init: function () {

            // 首先应用公共配置
            _.extend(require('er/config'), require('../config/er'));

            // 针对于ER的错误处理，配置其不吞错，直接使用util.processError来处理
            require('er/events').on('error', require('../util').processError);
        }
    };
    return erContext;
});