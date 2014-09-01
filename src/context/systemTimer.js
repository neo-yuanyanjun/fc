/**
 * @file 环境 - 系统时间点记录器
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

    var _ = require('underscore');

    var timerData = [];

    /**
     * TODO(wangkemiao): for jsduck
     */
    var systemTimer = {
        mark: function (key) {
            timerData.push({
                key: key,
                time: new Date()
            });
        },
        dumpToConsole: function () {
            // var start = timerData[0].time;
            var start = PR.tc0;
            _.each(timerData, function (item) {
                console.log(item.key + ': ' + (item.time - start));
            });
        },
        getForMonitor: function () {
            return timerData;
        }
    };

    return systemTimer;
});