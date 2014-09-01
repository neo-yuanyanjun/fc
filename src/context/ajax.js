/**
 * @file 环境准备 - ajax
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

    var ajax = require('../ajax');

    /**
     * 环境准备 - ajax
     */
    var ajaxContext = {
        init: function () {

            // 针对于ajax的错误处理，配置其不吞错，直接使用util.processError来处理
            ajax.on('error', require('../util').processError);
        }
    };

    return ajaxContext;
});