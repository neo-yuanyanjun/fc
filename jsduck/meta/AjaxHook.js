/**
 * @class meta.AjaxHook
 *
 * AJAX钩子配置，通过{@link Ajax#hooks}提供，
 * 可通过重写方法来改变AJAX的执行行为
 */
function AjaxHook() {
    /**
     * @method beforeEachSession
     *
     * 在一个{@link AjaxSession}开始执行之前调用
     *
     * @param {AjaxSession} session session实例
     */
    this.beforeEachSession;

    /**
     * @method afterEachSession
     *
     * 在一个{@link AjaxSession}彻底结束之后调用
     *
     * @param {AjaxSession} session session实例
     */
    this.afterEachSession;

    /**
     * @method beforeEachRequest
     *
     * 任意ajax执行之前调用
     *
     * @param {meta.AjaxOption} option 当前执行请求的参数
     */
    this.beforeEachRequest;

    /**
     * @method afterEachRequest
     *
     * 在任意ajax经过数据分析后认为是失败后调用
     *
     * @param {meta.AjaxOption} option 当前执行请求的参数
     */
    this.afterEachRequest;

    /**
     * @method eachSuccess
     *
     * 在任意ajax经过数据分析后认为是成功后调用
     *
     * @param {meta.AjaxOption} option 当前执行请求的参数
     * @param {Mixed} data 经处理后的数据
     */
    this.eachSuccess;

    /**
     * @method eachFailure
     *
     * 在任意ajax经过数据分析后认为是失败后调用
     *
     * @param {meta.AjaxOption} option 当前执行请求的参数
     * @param {meta.AjaxFailData} data 失败相关的数据
     */
    this.eachFailure;
}
