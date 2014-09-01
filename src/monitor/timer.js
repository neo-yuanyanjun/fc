/**
 * @file 凤巢业务端的公共层级 - 监控体系 - 计时器
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {
    var spentSaver = {};  // 保存计时数据

    var timer = {

        /**
         * 开始计时
         */
        start: function (key) {
            require('er/assert').equals(
                spentSaver[key], null, '开始计时器' + key + '时，此计时信息已经存在！'
            );
            spentSaver[key] = (new Date()).valueOf();
        },

        /**
         * 结束计时
         */
        stop: function (key) {
            require('er/assert').has(
                spentSaver[key],
                '结束计时器' + key + '时，此计时信息不存在！'
            );
            var spent = (new Date()).valueOf() - spentSaver[key];
            require('er/assert').greaterThan(
                spent, 0, '计时器' + key + '的计算结果小于0！'
            );

            // 清空当前计时器
            delete spentSaver[key];
            return spent;
        },

        /**
         * 重置计时器
         */
        reset: function (key) {
            require('er/assert').has(
                spentSaver[key],
                '重置计时器' + key + '时，此计时信息不存在！'
            );
            delete spentSaver[key];
            timer.start(key);
        }
    };

    return timer;
});