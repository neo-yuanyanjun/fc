/**
 * FC (FengChao Framework)
 *
 * @ignore
 * @file 系统相关配置 - er
 * @author Leo Wang(wangkemiao@baidu.com)
 */
define(
    /**
     * @class ErConfig
     *
     * 系统相关配置 - er
     *
     * @singleton
     * @type {meta.ErConfig}
     */
    {
        /**
         * 起始路径
         * from er.config
         *
         * @type {string}
         */
        indexURL: '/',

        /**
         * 系统名称，当访问一个没有配置{@link meta.ActionContext#title}的Action时，
         * 会默认使用此配置的值作为`document.title`显示
         * from er.config
         *
         * @type {string}
         */
        systemName: '搜索推广',

        /**
         * er的action的定义配置
         * @type {Array.<Object>}
         */
        actionConf: []
    }
);
