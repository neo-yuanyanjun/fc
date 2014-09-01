/**
 * @class meta.AjaxConfig
 *
 * AJAX请求参数
 */
function AjaxConfig() {

    /**
     * @property {meta.AjaxOption} [defaultOption]
     *
     * 默认ajax请求参数，会被单个请求传入的配置覆盖
     */
    this.defaultOption;

    /**
     * @property {string} [redirectUrl=""]
     *
     * 默认转向url，当ajax请求server表示需要进行redirect，又没有提供redirecturl
     * 就会转至此地址
     */
    this.redirectUrl;

    /**
     * @property {Object} [STATUS_CODE]
     * @static
     *
     * ajax行为处理结果的业务code
     */
    this.STATUS_CODE;

    /**
     * @property {Object} [STATUS_DESC]
     * @static
     *
     * ajax行为处理结果的业务code的描述信息
     */
    this.STATUS_DESC;
}