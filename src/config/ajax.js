/**
 * FC (FengChao Framework)
 *
 * @ignore
 * @file 系统相关配置 - ajax
 * @author Leo Wang(wangkemiao@baidu.com)
 */
define(function (require) {

    var _ = require('underscore');

    /**
     * ajax数据携带的业务status code配置
     * @type {Object}
     */
    var REQ_STATUS_CODE = {
        INITIALIZE: 0,
        SUCCESS: 200,  // 这是成功的标识，下面的都是失败
        PARTFAIL: 300,  // 业务部分失败
        FAIL: 400,  // 业务失败
        SERVER_ERROR: 500,  // 服务端异常
        PARAMETER_ERROR: 600,  // 请求参数错误
        NOAUTH: 700,  // 没有权限
        SERVER_EXCEEDED: 800,  // 数量超过限制
        TIMEOUT: 900,  // 超时
        CLIENT_SIDE_EXCEPTION: 910,  // ajax成功了，但是后置处理数据抛出异常
        REQUEST_ERROR: 920,  // ajax通讯发生了错误，这时需要去看httpStatus
        UNRECOGNIZED_STATUS: 930  // 返回的status没有被识别
    };

    /**
     * ajax的数据携带的业务status code对应的desc配置
     * @type {Object}
     */
    var REQ_STATUS_DESC = {
        INITIALIZE: 'ajax-initialize',
        SUCCESS: 'ajax-success',
        PARTFAIL: 'ajax-some-failed',
        FAIL: 'ajax-fail',
        SERVER_ERROR: 'ajax-server-error',
        PARAMETER_ERROR: 'ajax-parameter-error',
        NOAUTH: 'ajax-noauth',
        SERVER_EXCEEDED: 'ajax-server-exceeded',
        TIMEOUT: 'ajax-timeout',
        CLIENT_SIDE_EXCEPTION: 'ajax-client-side-exception',
        REQUEST_ERROR: 'ajax-request-error',
        UNRECOGNIZED_STATUS: 'ajax-unrecognized-status'
    };

    // 模块声明时，自动初始化具体的code对应的描述，增加值对应的描述
    for (var key in REQ_STATUS_CODE) {
        if (REQ_STATUS_CODE.hasOwnProperty(key)) {
            REQ_STATUS_DESC[REQ_STATUS_CODE[key]] = REQ_STATUS_DESC[key];
        }
    }

    /**
     * @class AjaxConfig
     *
     * 系统相关配置 - ajax
     * 默认使用单url+path的组合请求方式
     *
     * @singleton
     * @type {meta.AjaxConfig}
     */
    return {

        /**
         * 请求默认配置
         * @type {meta.AjaxOption}
         */
        defaultOption: {

            /**
             * 默认url
             * @type {string}
             */
            url: 'request.ajax',

            /**
             * 默认超时时间
             * @type {number}
             */
            timeout: 30000,

            /**
             * 默认数据类型
             * @type {string}
             */
            dataType: 'json',

            /**
             * 默认发送数据
             * @type {Object}
             */
            data: {}
        },

        /**
         * 默认转向url，在server返回redirect为真，又未指定转向地址时使用
         * 如此遗留为空，会进行当前页刷新
         * @type {string}
         */
        redirectUrl: '',

        /**
         * ajax行为处理结果的业务code
         * @type {string}
         */
        REQ_STATUS_CODE: REQ_STATUS_CODE,

        /**
         * ajax行为处理结果的业务code描述
         * @type {string}
         */
        REQ_STATUS_DESC: REQ_STATUS_DESC,
    };
});
