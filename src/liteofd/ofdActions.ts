import { AttributeKey, OFD_ACTION, OFD_KEY } from "./attrType";
import LiteOfd from "./liteOfd";
import { XmlData } from "./ofdData";
import { OfdDocument } from "./ofdDocument";
import * as parser from "./parser"



export const executeAction = (liteOfd: LiteOfd, ofdDocument: OfdDocument, action: XmlData) => {
    let actionEvent = parser.findAttributeValueByKey(action, AttributeKey.Event)
    switch(actionEvent) {
        case OFD_ACTION.CLICK:
            executeClickAction(liteOfd, action)
        break;
    }
}


const executeClickAction = (liteOfd: LiteOfd, action: XmlData) => {
    console.log("执行点击行动")
    let actionDest = parser.findValueByTagName(action, OFD_KEY.Goto)
    if(actionDest) {
        let pageNum = parser.findAttributeValueByKey(action, AttributeKey.PageNum)
        let topPosition = parser.findAttributeValueByKey(action, AttributeKey.Top)
        let topPos = liteOfd.getOfdDocument().convertToDpi(parseFloat(topPosition))
        console.log("执行跳转行动", actionDest, topPosition, topPos)
        if(pageNum) {
            liteOfd.goToPage(parseInt(pageNum))
        }
    }
}
