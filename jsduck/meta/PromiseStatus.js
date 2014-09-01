/**
 * @class meta.PromiseStatus
 */
function PromiseStatus() {

    /**
     * 初始化状态
     * @property {string} [INITIALIZE="initialize"]
     */
    this.INITIALIZE;

    /**
     * 成功状态
     * @property {string} [RESOLVED="resolved"]
     */
    this.RESOLVED;

    /**
     * 失败状态
     * @property {string} [REJECTED="rejected"]
     */
    this.REJECTED;
}