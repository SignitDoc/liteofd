import { BaseSvg } from "./BaseSvg"
import { XmlData } from "../ofdData"
import * as parser from "../parser"
import { AttributeKey, OFD_KEY } from "../attrType"
import { calPathPoint, convertPathAbbreviatedDatatoPoint } from "../utils/utils"
import { getCTM, getCTMByStr, parseColor, parseColorToHex } from "../utils/elementUtils"
import { OfdDocument } from "../ofdDocument"

export class PathSvg extends BaseSvg {

	private nodeData: XmlData // 最外层的svg的数据
	private svgContainer: SVGElement // svg的包裹的，每个组件都有一个svg包裹，比如path带有一个，而text则是svg包裹text，然后text包裹tspan这样子
	private pathSvgStyle = "" // path的style
	private svgContainerStyle = "position: absolute;overflow: visible;" // 外层svg的style
	private boundaryBox: {
		x: number,
		y: number,
		width: number,
		height: number,
	} =  { x: 0, y: 0, width: 0, height: 0 }
	private svgDefs: SVGElement =document.createElementNS('http://www.w3.org/2000/svg', 'defs')// 引用的svg
	private pathId = "" // 路径的id
	private ofdDocument: OfdDocument
	private showDefaultStrokeColor = true // 默认显示stroke的颜色为黑色

	// 初始化传入xmldata构建一个path的数据
	constructor(ofdDocument: OfdDocument, nodeData: XmlData, showDefaultStrokeColor = true) {
		super()
		this.ofdDocument = ofdDocument
		this.nodeData = nodeData
		this.pathId = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
		this.showDefaultStrokeColor = showDefaultStrokeColor

		this.svgContainer = this.createContainerSvg()
		this.svgContainer.setAttribute("style", this.svgContainerStyle)
	}

	// 添加boundary范围
	#addBoundary(node: XmlData) {
		let boundaryStr = parser.findAttributeValueByKey(node, AttributeKey.Boundary)
		if (boundaryStr) {
			this.boundaryBox = this.ofdDocument.convertToBox(boundaryStr)

			let svgStyle = `left: ${this.boundaryBox.x}px;top: ${this.boundaryBox.y}px;
	width: ${this.boundaryBox.width}px;height: ${this.boundaryBox.height}px;`
			this.svgContainerStyle += svgStyle
		}
	}

	// 添加路径
	#addPathD(node: XmlData, pathSvg: SVGPathElement) {
		// 线条的路径
		let abbreviatedData = parser.findValueByTagNameOfFirstNode(node, OFD_KEY.AbbreviatedData)
		if (!abbreviatedData) {
			return
		}
		// 查找node的ID属性值
		const points = calPathPoint(this.ofdDocument, convertPathAbbreviatedDatatoPoint(abbreviatedData.value))
		// path的路径
		let pathD = ""
		for (const point of points) {
			if (point.type === 'S' || point.type === 's') {
				console.log("point", point)
				// debugger
			}
			switch (point.type) {
				case 'B':
					pathD += `C${point.x1} ${point.y1} ${point.x2} ${point.y2} ${point.x3} ${point.y3} `
					break
				// case 'C':
				// 	pathD += `Z`
				// 	break
				case 'M': // 移动到
					pathD += `M${point.x} ${point.y} `
					break
				case 'm': // 相对移动
				pathD += `m${point.dx} ${point.dy} `
				break
				case 'L': // 画线到
				pathD += `L${point.x} ${point.y} `
				break
				case 'l': // 相对画线
				pathD += `l${point.dx} ${point.dy} `
				break
				case 'H': // 水平线到
				pathD += `H${point.x} `
				break
				case 'h': // 相对水平线
				pathD += `h${point.dx} `
				break
				case 'V': // 垂直线到
				pathD += `V${point.y} `
				break
				case 'v': // 相对垂直线
				pathD += `v${point.dy} `
				break
				case 'C': // 三次贝塞尔曲线
				case 'c': // 三次贝塞尔曲线
					pathD += `C${point.x1} ${point.y1} ${point.x2} ${point.y2} ${point.x} ${point.y} `
				break
				case 'S': // 平滑三次贝塞尔曲线
					if ('x2' in point && 'y2' in point) {
						pathD += `S${point.x2} ${point.y2} ${point.x} ${point.y} `
					} else {
						pathD += `S${point.x} ${point.y} `
					}
				break
				case 's': // 相对平滑三次贝塞尔曲线
				if ('x2' in point && 'y2' in point) {
					pathD += `s${point.x2} ${point.y2} ${point.x} ${point.y} `
				} else {
					pathD += `s${point.x} ${point.y} `
				}
			break
				case 'Q': // 二次贝塞尔曲线
				pathD += `Q${point.x1} ${point.y1} ${point.x} ${point.y} `
				break
				case 'q': // 相对二次贝塞尔曲线
				pathD += `q${point.dx1} ${point.dy1} ${point.dx} ${point.dy} `
				break
				case 'T': // 平滑二次贝塞尔曲线
				pathD += `T${point.x} ${point.y} `
				break
				case 't': // 相对平滑二次贝塞尔曲线
				pathD += `t${point.dx} ${point.dy} `
				break
				case 'A': // 椭圆弧
				pathD += `A${point.rx} ${point.ry} ${point.xAxisRotation} ${point.largeArcFlag} ${point.sweepFlag} ${point.x} ${point.y} `
				break
				case 'a': // 相对椭圆弧
				pathD += `a${point.rx} ${point.ry} ${point.xAxisRotation} ${point.largeArcFlag} ${point.sweepFlag} ${point.dx} ${point.dy} `
				break
				case 'Z': // 闭合路径
				case 'z':
				pathD += `Z`
				break
			}
		}
		if (pathD.startsWith('S')) {
			// 如果pathD是以S开头且只包含一个坐标值，则将S修改为M
			const match = pathD.match(/^S(\d+(?:\.\d+)?\s+\d+(?:\.\d+)?)/);
			if (match) {
				pathD = `M${match[1]} ${pathD.slice(match[0].length)}`;
			}
		} else if (!pathD.startsWith('M')) {
			// 如果pathD不是以M开头，则添加M移动到初始点
			// 假设初始点为(0,0)，您可能需要根据实际情况调整这个值
			pathD = `M0 0 ${pathD}`;
		}
		// console.log("render pathD", pathD)
		pathSvg.setAttribute('d', pathD);
	}

	#addDashPattern(nodeData: XmlData) {
		let pathStyle = "";
		const dashPattern = parser.findAttributeValueByKey(nodeData, AttributeKey.DashPattern);
		if (dashPattern) {
			const dashArray = dashPattern.split(' ').map(value => this.ofdDocument.convertToDpi(parseFloat(value)));
			pathStyle = `stroke-dasharray: ${dashArray.join(' ')};`;
		}
		return pathStyle;
	}


    /**
     * 添加填充颜色
     * @param nodeData XML数据节点
     * @returns 填充颜色的样式字符串
     */
	#addFilLColor(nodeData: XmlData) {
		let pathStyle = ""
		let fillColorObj = parser.findValueByTagName(nodeData, OFD_KEY.FillColor)
		let fillColorBoolean = parser.findAttributeValueByKey(nodeData, AttributeKey.Fill)
		let fillColorStr = fillColorObj && parser.findAttributeValueByKey(fillColorObj, AttributeKey.Value)
		let colorAlpha = fillColorObj && parseInt(parser.findAttributeValueByKey(fillColorObj, AttributeKey.Alpha)) || 255

		if (fillColorBoolean) {
			if (fillColorObj && fillColorStr) {
				let fillColorValue = parseColorToHex(fillColorStr, colorAlpha)
				pathStyle += `fill: ${fillColorValue};`
			}
		} else {
			if (fillColorStr) {
				let fillColorValue = parseColorToHex(fillColorStr, colorAlpha)
				pathStyle += `fill: ${fillColorValue};`
			}
		}
		if (!pathStyle) {
			pathStyle += `fill: none;`
		}

		return pathStyle
	}
    /**
     * 添加描边宽度
     * @param nodeData XML数据节点
     * @returns 描边宽度的样式字符串
     */
	#addStrokeWidth(nodeData: XmlData, showDefaultStrokeColor: boolean) {
		let pathStyle = ""
		let lineWidthStr = parser.findAttributeValueByKey(nodeData, AttributeKey.LineWidth)
		if (lineWidthStr) {
			let lineWidth = this.ofdDocument.convertToDpi(parseFloat(lineWidthStr))
			pathStyle = `stroke-width: ${lineWidth}px;`
		}
		// 如果有宽度，那么就添加stroke的颜色
		pathStyle += this.#addStrokeColor(nodeData, showDefaultStrokeColor)

		return pathStyle
	}

	/**
	 * 添加描边颜色
	 * @param nodeData XML数据节点
	 * @returns 描边颜色的样式字符串
	 */
	#addStrokeColor(nodeData: XmlData, showDefaultStrokeColor: boolean) {
		let pathStyle = ""
		let strokeColorObj = parser.findValueByTagName(nodeData, OFD_KEY.StrokeColor)
		let strokeColorBoolean = parser.findAttributeValueByKey(nodeData, AttributeKey.Stroke)
		let strokeColorStr = strokeColorObj && parser.findAttributeValueByKey(strokeColorObj, AttributeKey.Value)
		if (strokeColorBoolean && JSON.parse(strokeColorBoolean)) {
			if (strokeColorStr) {
				let fillColorValue = parseColor(strokeColorStr)
				pathStyle += `stroke: ${fillColorValue};`
			}
		} else if(showDefaultStrokeColor) {
			if (strokeColorStr) {
				let fillColorValue = parseColor(strokeColorStr)
				pathStyle += `stroke: ${fillColorValue};`
			} else if(this.showDefaultStrokeColor){
				pathStyle = `stroke: rgb(0, 0, 0);`
			}
		}

		return pathStyle
	}

	/**
	 * 添加裁剪路径
	 * 此方法用于为SVG路径元素添加裁剪效果。它会解析XML节点中的Clip信息，
	 * 创建SVG clipPath元素，设置裁剪路径的形状和变换，
	 * 并将裁剪路径应用到SVG路径元素上。
	 *
	 * @param nodeData XML数据节点，包含裁剪信息
	 * @param pathSvg SVG路径元素，将应用裁剪效果
	 */
	#addClip(nodeData: XmlData, pathSvg: SVGPathElement) {
		let clipList = parser.findValueByTagName(nodeData, OFD_KEY.Clip)
		if (clipList && clipList.children && clipList.children.length > 0) {
			let nodeID = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
			let clipPathEle = document.createElementNS("http://www.w3.org/2000/svg", "clipPath")
			let clipPathId = `CLIP_PATH_${nodeID}`
			clipPathEle.setAttribute("id", clipPathId)

			// 循环添加clip的值
			for (let i = 0; i < clipList.children.length; i++) {
				let clipNode = clipList.children[i] // clips下面的多个clip的子节点
				let clipArea = parser.findValueByTagName(clipNode, OFD_KEY.Area)
				let ctm = parser.findAttributeValueByKey(clipArea, AttributeKey.CTM)
				let clipCtm = getCTMByStr(ctm)
				// clip下面的path路径，就是裁剪的内容
				let clipPathSvg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
				// 这里的clip也可能是多个，现在只以一个处理
				let clipPath = parser.findValueByTagName(clipNode, OFD_KEY.Path)

				// 查找clipPath的fill属性
				let clipFill = parser.findAttributeValueByKey(clipPath, AttributeKey.Fill)
				if (clipFill && JSON.parse(clipFill)) {
					// 查找FillColor节点并获取其Value属性值
					let fillColorNode = parser.findValueByTagName(nodeData, OFD_KEY.FillColor);
					let fillColorValue = fillColorNode && parser.findAttributeValueByKey(fillColorNode, AttributeKey.Value);

					if (fillColorValue) {
						// 如果存在FillColor节点的Value属性，使用该值设置fill
						clipPathSvg.setAttribute("fill", parseColor(fillColorValue));
					} else {
						clipPathSvg.setAttribute("fill", clipFill === "true" ? "black" : "none")
					}
				} else {
					// 如果没有指定fill属性，默认设置为black
					clipPathSvg.setAttribute("fill", "black")
				}
				this.#addPathD(clipPath, clipPathSvg)
				if (clipCtm) {
					clipPathSvg.setAttribute("transform", clipCtm);
				}

				clipPathEle.appendChild(clipPathSvg)
			}
			// 给pathSvg添加clipPath属性
			pathSvg.setAttribute("clip-path", `url(#${clipPathId})`);

			this.svgDefs.appendChild(clipPathEle)
		}
	}

	// 给pathsvg添加ctm矩阵
	#addCTM(nodeData: XmlData, pathSvg: SVGPathElement) {
		let tempCtm = getCTM(nodeData)
		tempCtm && pathSvg.setAttribute("transform", tempCtm)
	}

	/**
	 * 添加线性渐变定义
	 * 此方法用于为路径添加线性渐变效果。它会解析XML节点中的轴向阴影（AxialShd）信息，
	 * 创建SVG线性渐变元素，设置渐变的起点和终点，添加颜色停止点，
	 * 并将渐变应用到路径上。
	 *
	 * @param nodeData XML数据节点，包含渐变信息
	 * @param pathSvg SVG路径元素，将应用渐变效果
	 */
	#addLinearGradientDefs(nodeData: XmlData, pathSvg: SVGPathElement) {
		let axialShdNode = parser.findValueByTagName(nodeData, OFD_KEY.AxialShd)
		if (axialShdNode) {
			let startPoint = parser.findAttributeValueByKey(axialShdNode, AttributeKey.StartPoint)
			let endPoint = parser.findAttributeValueByKey(axialShdNode, AttributeKey.EndPoint)
			let colorSegment = parser.findValueByTagName(axialShdNode, OFD_KEY.Segment)
			let linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
			if (startPoint && endPoint) {
				let s1 = startPoint.split(' ')
				let s2 = endPoint.split(' ')
				let x1 = (this.ofdDocument.convertToDpi(parseFloat(s1[0])) / this.boundaryBox.width) * 100 + '%'
				let y1 = (this.ofdDocument.convertToDpi(parseFloat(s1[1])) / this.boundaryBox.height) * 100 + '%'
				let x2 = (this.ofdDocument.convertToDpi(parseFloat(s2[0])) / this.boundaryBox.width) * 100 + '%'
				let y2 = (this.ofdDocument.convertToDpi(parseFloat(s2[1])) / this.boundaryBox.height) * 100 + '%'

				linearGradient.setAttribute("x1", x1)
				linearGradient.setAttribute("y1", y1)
				linearGradient.setAttribute("x2", x2)
				linearGradient.setAttribute("y2", y2)
			}

			if (colorSegment && colorSegment.children.length > 0) {
				let colorChildren = colorSegment.children
				for (let i = 0; i < colorChildren.length; i++) {
					let cs = colorChildren[i]
					let position = parser.findAttributeValueByKey(cs, AttributeKey.Position)
					let colorNode = parser.findValueByTagName(cs, OFD_KEY.Color)
					let colorValue = parser.findAttributeValueByKey(colorNode, AttributeKey.Value)
					let stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
					let offset = parseFloat(position) * 100 + "%"
					let color = parseColor(colorValue)
					let style = `stop-color: ${color}; stop-opacity: 1;`
					stop.setAttribute("style", style)
					stop.setAttribute("offset", offset)
					linearGradient.appendChild(stop)
				}
			}
			let gradientId = `gradient_${this.pathId}`
			linearGradient.setAttribute("id", gradientId)

			this.svgDefs.appendChild(linearGradient)
			pathSvg.setAttribute("fill", `url(#${gradientId})`)
			return true
		} else {
			return false
		}
	}


	/**
	 * 添加路径SVG元素
	 *
	 * 该方法创建一个SVG路径元素，并应用以下效果:
	 * 1. 添加路径数据
	 * 2. 应用坐标变换
	 * 3. 添加线性渐变
	 * 4. 应用裁剪
	 * 5. 设置绘制参数
	 * 6. 设置填充颜色
	 * 7. 设置线宽和线条颜色
	 *
	 * @param nodeData XML数据节点，包含路径的各种属性信息
	 * @returns 创建并配置好的SVG路径元素
	 */
	#addPathSvg(nodeData: XmlData) {
		let pathSvg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		let pathStyle = ""

		// 添加路径
		this.#addPathD(nodeData, pathSvg)
		// 添加矩阵变换
		this.#addCTM(nodeData, pathSvg)
		// 添加渐变色
		let addLinearGradient = this.#addLinearGradientDefs(nodeData, pathSvg)
		// 添加裁剪
		this.#addClip(nodeData, pathSvg)
		// 添加虚线模式
		pathStyle += this.#addDashPattern(nodeData);
		// 添加绘制参数
		pathStyle += this.#addDrawParam(nodeData, pathSvg)
		if (!addLinearGradient) {
			// 填充颜色
			pathStyle += this.#addFilLColor(nodeData)
		}
		// 添加线宽度和线条颜色
		pathStyle += this.#addStrokeWidth(nodeData, true)

		pathSvg.setAttribute("style", pathStyle)
		return pathSvg
	}

	/**
	 * 创建包含路径的SVG容器元素
	 *
	 * 该方法执行以下操作:
	 * 1. 创建一个新的SVG元素
	 * 2. 设置SVG版本
	 * 3. 添加SVG的ID和z-index
	 * 4. 添加外层边界
	 * 5. 创建并添加路径元素
	 * 6. 将定义(如渐变)添加到路径元素中
	 *
	 * @returns 创建并配置好的SVG容器元素
	 */
	createContainerSvg(): SVGElement {
		let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		svg.setAttribute('version', '1.1')

		this.#addSvgIDAndZIndex(this.nodeData, svg)
		// 添加外层的boundary
		this.#addBoundary(this.nodeData)
		// svg下面添加path
		let pathSvg = this.#addPathSvg(this.nodeData)
		svg.appendChild(pathSvg)
		svg.appendChild(this.svgDefs)
		return svg
	}

	getContainerSvg(): SVGElement {
		return this.svgContainer
	}


	#addSvgIDAndZIndex(nodeData: XmlData, svg: SVGSVGElement) {
		let svgID = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
		if (svgID) {
			svg.setAttribute("SVG_ID", svgID)
			this.svgContainerStyle += `z-index: ${svgID};`
		}
	}

	#addDrawParam(nodeData: XmlData, pathSvg: SVGPathElement) {
		let drawParam = parser.findAttributeValueByKey(nodeData, AttributeKey.DrawParam)
		if (drawParam) {
			let drawParamNode = parser.findNodeByAttributeKeyValue(drawParam, AttributeKey.ID, this.ofdDocument.publicRes)
			if (drawParamNode) {
				let pathStyle = ""
				// 填充颜色
				pathStyle += this.#addFilLColor(drawParamNode)
				// 添加线宽度和线条颜色
				pathStyle += this.#addStrokeWidth(drawParamNode, true)
				// 如果有宽度，那么就添加stroke的颜色
				// pathStyle += this.#addStrokeColor(drawParamNode, false)
				return pathStyle
			}
		}
		return ""
	}
}
