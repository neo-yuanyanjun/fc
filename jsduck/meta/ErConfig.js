/**
 * @class meta.ErConfig
 *
 * AJAX请求参数
 */
function ErConfig() {

    /**
     * @property {string} [indexURL]
     *
     * 默认首页路径
     * from er.config
     */
    this.indexURL;

    /**
     * @property {string} [systemName="搜索推广"]
     *
     * 系统名称，当访问一个没有配置{@link meta.ActionContext#title}的Action时，
     * 会默认使用此配置的值作为`document.title`显示
     * from er.config
     */
    this.systemName;

    /**
     * @property {Array} [actionConf]
     *
     * er的action的定义配置
     */
    this.actionConf
}
