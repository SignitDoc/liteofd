import { OfdDocument } from "./ofdDocument"

type IXmlData = {
	attrsMap: Map<string, any>, // 属性值
	children: IXmlData[], // 子标签
	value: string, // 标签中的值
	tagName: string, // 一个标签的名称
	fileName: string // xml文件的路径和名称
	id: string // 节点的ID属性值
	signList: IXmlData[] // 页面包含的签名的数组
	sealObject: any // 签名的数据，印章数据，就是比如signedvalue.data中的数据
	sealData: OfdDocument | string | null // 如果是ofd类型的签章，那么这个sealofdDocument就是签章的ofd数据，需要渲染这个；也可以是图片的base64数据
	annots: XmlData | null // 注释数据列表，包含了ofd:Annotations
	boundaryBox: XmlData | null // 当前对象的位置信息
}

// 节点的数据
export class XmlData implements IXmlData{
	attrsMap: Map<string, any> = new Map()
	children: XmlData[] = []
	tagName: string = ""
	value: string = ""
	fileName = ""
	id = ""
	signList: XmlData[] = []
	sealObject = null
	sealData: OfdDocument | string | null = null
	annots: XmlData | null= null
	boundaryBox = null
}
