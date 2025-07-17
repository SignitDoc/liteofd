// OFD包含的属性的key值
export const AttributeKey = {
	FONT: "Font", // 字体
	Boundary: "Boundary", // 组件范围
	ID: "ID", // 组件的id
	CTM: "CTM", // 变换矩阵
	DeltaX: "DeltaX", // x的位置
	DeltaY: "DeltaY", // y的位置
	FontSize: "Size", // 字体大小
	LineWidth: "LineWidth", // path的线条宽度
	Stroke: "Stroke", // 线条
	Fill: "Fill", // 填充
	Value: "Value",
	Alpha: "Alpha", // 颜色透明度
	ColorSpace: "ColorSpace",
	DrawParam: "DrawParam",
	Cap: "Cap",
	X: "X",
	BaseLoc: "BaseLoc",
	Y: "Y",
	TemplateID: "TemplateID",
	ZOrder: "ZOrder",
	StartPoint: "StartPoint",
	EndPoint: "EndPoint",
	Position: "Position",
	ResourceID: "ResourceID", // 引用资源ID
	FontName: "FontName", // 字体名称
	FamilyName: "FamilyName", // 字体名称
	HScale: "HScale", // 字体的横向压缩
	VScale: "VScale", // 字体的纵向压缩
	WScale: "WScale", // 字体的宽度
	Weight: "Weight", // 字体粗细
	Bold: "Bold", // 字体粗细
	Italic: "Italic", // 字体斜体
	PageRef: "PageRef", // 签章的页面引用
	Clip: "Clip", // 裁剪
	Title: "Title", // 大纲的标题
	PageNum: "PageNum", // 大纲的页面位置
	Event: "Event", // 点击事件，比如大纲中的action的事件Click
	PageID: "PageID", // 
	Type: "Type", // 
	Subtype: "Subtype", // 注释的子类型
	DashPattern: "DashPattern", // 
	BitsPerComponent: "BitsPerComponent", // 颜色空间每个分量的位数
}

// ofd的xml标签中的标签名tagName
export const OFD_KEY = {
	OFD: "ofd:OFD", // OFD.xml的根
	Creator: "ofd:Creator", // 创建者
	Title: "ofd:Title",
	ModDate: "ofd:ModDate",
	DocID: "ofd:DocID",
	CreationDate: "ofd:CreationDate",
	CreatorVersion: "ofd:CreatorVersion",
	CustomData: "ofd:CustomData",
	DocRoot: "ofd:DocRoot",
	Pages: "ofd:Pages",
	Page: "ofd:Page",
	Outlines: "ofd:Outlines",
	CommonData: "ofd:CommonData",
	VPreferences: "ofd:VPreferences",
	Actions: "ofd:Actions",
	Annotations: "ofd:Annotations",
	PublicRes: "ofd:PublicRes",
	DocumentRes: "ofd:DocumentRes",
	Content: "ofd:Content",
	Area: "ofd:Area",
	PhysicalBox: "ofd:PhysicalBox",
	CropBox: "ofd:CropBox",
	Layer: "ofd:Layer",
	PathObject: "ofd:PathObject",
	AbbreviatedData: "ofd:AbbreviatedData",
	StrokeColor: "ofd:StrokeColor",
	FillColor: "ofd:FillColor",
	TextObject: "ofd:TextObject",
	TextCode: "ofd:TextCode",
	DrawParams: "ofd:DrawParams",
	Template: "ofd:Template",
	TemplatePage: "ofd:TemplatePage",
	Segment: "ofd:Segment",
	AxialShd: "ofd:AxialShd",
	Color: "ofd:Color",
	ImageObject: "ofd:ImageObject",
	MultiMedia: "ofd:MultiMedia",
	MediaFile: "ofd:MediaFile",
	Font: "ofd:Font",
	Fonts: "ofd:Fonts",
	ColorSpaces: "ofd:ColorSpaces",
	ColorSpace: "ofd:ColorSpace",
	CustomDatas: "ofd:CustomDatas",
	DocInfo: "ofd:DocInfo",
	PageArea: "ofd:PageArea",
	Signatures: "ofd:Signatures",
	References: "ofd:References",
	SignedInfo: "ofd:SignedInfo",
	Annot: "ofd:Annot",
	Clips: "ofd:Clips",
	Clip: "ofd:Clip",
	Signature: "ofd:Signature",
	SignedValue: "ofd:SignedValue",
	MaxSignId: "ofd:MaxSignId",
	StampAnnot: "ofd:StampAnnot",
	FontFile: "ofd:FontFile",
	Path: "ofd:Path",
	PageBlock: "ofd:PageBlock",
	Reference: "ofd:Reference",
	Action: "ofd:Action",
	OutlineElem: "ofd:OutlineElem",
	Goto: "ofd:Goto",
	Dest: "ofd:Dest",
	Bookmarks: "ofd:Bookmarks",
	Bookmark: "ofd:Bookmark",
	FileLoc: "ofd:FileLoc",
	Parameters: "ofd:Parameters",
	Parameter: "ofd:Parameter",
	Appearance: "ofd:Appearance",
}

// 包含了子节点的tag的名称，用来xml进行解析时候只有一个子节点时候的解析成数组，是可能包含多个的才加入到这里面，比如TextObject可能再content中有多个，那么就加TextObject而不是Content
export const MultiChildTagName = [
	OFD_KEY.DocInfo,
	OFD_KEY.CustomData,
	OFD_KEY.Font,
	OFD_KEY.CommonData,
	OFD_KEY.PageArea,
	OFD_KEY.Page,
	OFD_KEY.MaxSignId,
	OFD_KEY.Layer,
	OFD_KEY.PathObject,
	OFD_KEY.TextObject,
	OFD_KEY.Signature,
	OFD_KEY.Reference,
	OFD_KEY.Annot,
	OFD_KEY.AxialShd,
	OFD_KEY.Action,
	OFD_KEY.ImageObject,
	OFD_KEY.StampAnnot,
	OFD_KEY.Clip,
	OFD_KEY.TemplatePage,
	OFD_KEY.OutlineElem,
	OFD_KEY.Parameter,
	OFD_KEY.Annot,
]

export const OFD_ACTION = {
	CLICK: "CLICK",
}

export const ANNOT_TYPE = {
	Highlight: {
		value: "Highlight",
		subType: {
			Underline: "Underline",
			Highlight: "Highlight",
		}
	}, // 高亮注释
	Path: {
		value: "Path",
		subType: {
			Watercolor: "Watercolor", // 水印，需要在文本层上面
			Fluorescent: "Fluorescent", // 荧光笔，在文本层上面 
			Pen: "Pen", // 笔触，在文本层上面
			Strikeout: "Strikeout", // 删除线，要在文本层的index上面
			Squiggly: "Squiggly", // 下划线的弯弯曲曲类型，放在文本底部的，要在文本下面把
		}
	}, 
	Stamp: {
		value: "Stamp",
		subType: {
			Stamp: "Stamp", // 印章
			SignatureInFile: "SignatureInFile", // 印章
		}
	}
	
}