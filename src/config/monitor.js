/**
 * FC (FengChao Framework)
 *
 * @ignore
 * @file 系统相关配置 - monitor
 * @author Leo Wang(wangkemiao@baidu.com)
 */
define(
    /**
     * @class MonitorConfig
     *
     * 系统相关配置 - monitor
     *
     * @singleton
     */
    {
        /**
         * 监控发送地址
         *
         * @type {string}
         */
        monitorUrl: 'fclogimg.gif',

        /**
         * 攒多少个就发出一条监控
         *
         * @type {string}
         */
        STACK_SIZE: 2
    }
);
