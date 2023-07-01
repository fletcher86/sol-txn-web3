"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jackson_js_1 = require("jackson-js");
class SerdeUtil {
    static convertStringToSolTxnResponse(rawSolTxnDetail) {
        const r = this.objectMapper.readValue(rawSolTxnDetail, SolTxnResponse_1.SolTxnResponse);
        return r;
    }
    static readValue(str, valueType) {
        return this.objectMapper.readValue(str, valueType);
    }
    static writeValueAsString(o) {
        return this.objectMapper.writeValueAsString(o);
    }
}
SerdeUtil.objectMapper = new jackson_js_1.ObjectMapper();
exports.default = SerdeUtil;
