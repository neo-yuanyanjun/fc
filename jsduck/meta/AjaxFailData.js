/**
 * @class meta.AjaxFailData
 *
 * AJAX钩子配置，通过{@link Ajax#hooks}提供，
 * 可通过重写方法来改变AJAX的执行行为
 */
function AjaxFailData() {

    /**
     * @property {number} [status] 状态，取值{@link meta.AjaxConfig.REQ_CODE}
     */
    this.status;

    /**
     * @property {string} [status] 状态描述，取值{@link meta.AjaxConfig.REQ_DESC}
     */
    this.desc;

    /**
     * @property {*} [response] 本次的返回
     */
    this.response;

    /**
     * @property {number=} [httpStatus] HTTP状态，在ajax请求错误时存在
     */
    this.httpStatus;
}
