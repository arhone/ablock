/**
 * Запрет закрытия shadow
 * @type {(init: ShadowRootInit) => ShadowRoot}
 * @private
 */
Element.prototype._attachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function () {
    return this._attachShadow({ mode: "open" });
};

/**
 * Обработка eval
 * @type {eval}
 */
window.evalCustom = eval;
eval = function (value) {
    if (
        value.match(/yaContext/)
        || value.match(/Ya\.Rum/)
    ) {
        return null;
    } else {
        //console.log('eval: ' + value);
        window.evalCustom(value);
    }
}
