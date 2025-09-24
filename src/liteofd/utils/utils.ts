

// 将box的字符串转成数据对象
export const convertToBox = (valueStr: string) => {
	let size = valueStr.split(" ")
	let x = parseFloat(size[0])
	let y = parseFloat(size[1])
	let width = parseFloat(size[2])
	let height = parseFloat(size[3])

	return {
		x: convertToDpi(x),
		y: convertToDpi(y),
		width: convertToDpi(width),
		height: convertToDpi(height),
	}
}

let MaxScale = 10;

let Scale = 10;

export const setMaxPageScale = function (scale: number) {
	MaxScale = scale > 10 ? 10 : scale;
}

export const setPageScal = function (scale: number) {
	Scale = scale > 1 ? scale : 1;
	Scale = Scale > MaxScale ? MaxScale : Scale;
}

export const convertToDpiWithScale = function (width: number, currentScale: number) {
	return millimetersToPixel(width, currentScale * 25.4);
}

export const convertToDpi = function (width: number) {
	return millimetersToPixel(width, Scale * 25.4);
}

export const convertToScaleDpi = function (width: number, scale: number) {
	return millimetersToPixel(width, scale * 25.4);
}

const millimetersToPixel = function (mm: number, dpi: number) {
	//毫米转像素：mm * dpi / 25.4
	return ((mm * dpi / 25.4));
}

export const convertPathAbbreviatedDatatoPoint = (abbreviatedData: string) => {
	let array = abbreviatedData.split(' ');
	let pointList = [];
	let i = 0;
	while (i < array.length) {
	  let command = array[i];
	  switch (command) {
		case 'M':
		case 'm':
		case 'L':
		case 'l':
		  pointList.push({
			'type': command,
			'x': parseFloat(array[i + 1]),
			'y': parseFloat(array[i + 2])
		  });
		  i += 3;
		  break;
		case 'H':
		case 'h':
		  pointList.push({
			'type': command,
			'x': parseFloat(array[i + 1])
		  });
		  i += 2;
		  break;
		case 'V':
		case 'v':
		  pointList.push({
			'type': command,
			'y': parseFloat(array[i + 1])
		  });
		  i += 2;
		  break;
		case 'C':
		case 'c':
		  if (array[i + 1] === undefined || array[i + 1] === null || isNaN(parseFloat(array[i + 1]))) {
			pointList.push({
			  'type': 'Z'
			});
			i += 1;
		  } else {
			pointList.push({
			  'type': command,
			  'x1': parseFloat(array[i + 1]),
			  'y1': parseFloat(array[i + 2]),
			  'x2': parseFloat(array[i + 3]),
			  'y2': parseFloat(array[i + 4]),
			  'x': parseFloat(array[i + 5]),
			  'y': parseFloat(array[i + 6])
			});
			i += 7;
		  }
		  break;
		case 'S':
		case 's':
			// 检查是否有足够的参数用于贝塞尔曲线
			if (i + 4 < array.length && !isNaN(parseFloat(array[i + 3])) && !isNaN(parseFloat(array[i + 4]))) {
				// 完整的S命令：S x2 y2 x y
				pointList.push({
					'type': command,
					'x2': parseFloat(array[i + 1]),
					'y2': parseFloat(array[i + 2]),
					'x': parseFloat(array[i + 3]),
					'y': parseFloat(array[i + 4])
				});
				i += 5;
			} else {
				// 简化的S命令：S x y (只有终点坐标)
				pointList.push({
					'type': command,
					'x': parseFloat(array[i + 1]),
					'y': parseFloat(array[i + 2])
				});
				i += 3;
			}
			break;
		case 'Q':
		case 'q':
		  pointList.push({
			'type': command,
			'x1': parseFloat(array[i + 1]),
			'y1': parseFloat(array[i + 2]),
			'x': parseFloat(array[i + 3]),
			'y': parseFloat(array[i + 4])
		  });
		  i += 5;
		  break;
		case 'T':
		case 't':
		  pointList.push({
			'type': command,
			'x': parseFloat(array[i + 1]),
			'y': parseFloat(array[i + 2])
		  });
		  i += 3;
		  break;
		case 'A':
		case 'a':
		  pointList.push({
			'type': command,
			'rx': parseFloat(array[i + 1]),
			'ry': parseFloat(array[i + 2]),
			'xAxisRotation': parseFloat(array[i + 3]),
			'largeArcFlag': parseInt(array[i + 4]),
			'sweepFlag': parseInt(array[i + 5]),
			'x': parseFloat(array[i + 6]),
			'y': parseFloat(array[i + 7])
		  });
		  i += 8;
		  break;
		case 'B': // 贝塞尔曲线
		  pointList.push({
			'type': command,
			'x1': parseFloat(array[i + 1]),
			'y1': parseFloat(array[i + 2]),
			'x2': parseFloat(array[i + 3]),
			'y2': parseFloat(array[i + 4]),
			'x3': parseFloat(array[i + 5]),
			'y3': parseFloat(array[i + 6])
		  });
		  i += 7;
		  break;
		case 'Z':
		case 'z':
		  pointList.push({
			'type': command
		  });
		  i++;
		  break;
		default:
		  // 如果遇到未知命令，跳过
		  i++;
		  break;
	  }
	}
	return pointList;
  }


export const convertPathAbbreviatedDatatoPoint2 = (abbreviatedData: string) => {
	let array = abbreviatedData.split(' ');
	let pointList = [];
	let i = 0;
	while (i < array.length) {
		if (array[i] === 'M' || array[i] === 'S') {
			let point = {
				'type': 'M',
				'x': parseFloat(array[i + 1]),
				'y': parseFloat(array[i + 2])
			}
			i = i + 3;
			pointList.push(point);
		}
		if (array[i] === 'L') {
			let point = {
				'type': 'L',
				'x': parseFloat(array[i + 1]),
				'y': parseFloat(array[i + 2])
			}
			i = i + 3;
			pointList.push(point);
		} else if (array[i] === 'C') {
			let point = {
				'type': 'C',
				'x': 0,
				'y': 0
			}
			pointList.push(point)
			i++;
		} else if (array[i] === 'B') {
			let point = {
				'type': 'B',
				'x1': parseFloat(array[i + 1]),
				'y1': parseFloat(array[i + 2]),
				'x2': parseFloat(array[i + 3]),
				'y2': parseFloat(array[i + 4]),
				'x3': parseFloat(array[i + 5]),
				'y3': parseFloat(array[i + 6])
			}
			i = i + 7;
			pointList.push(point);
		} else {
			i++;
		}
	}
	return pointList;
}

export const calPathPoint = function (abbreviatedPoint: any) {
	let pointList = [];
	let currentX = 0, currentY = 0;

	for (let i = 0; i < abbreviatedPoint.length; i++) {
	  let point = abbreviatedPoint[i];
	  switch (point.type) {
		case 'M':
		case 'L':
		  point.x = convertToDpi(point.x);
		  point.y = convertToDpi(point.y);
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'm':
		case 'l':
		  point.x = convertToDpi(point.x) + currentX;
		  point.y = convertToDpi(point.y) + currentY;
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'H':
		  point.x = convertToDpi(point.x);
		  point.y = currentY;
		  currentX = point.x;
		  pointList.push(point);
		  break;
		case 'h':
		  point.x = convertToDpi(point.x) + currentX;
		  point.y = currentY;
		  currentX = point.x;
		  pointList.push(point);
		  break;
		case 'V':
		  point.x = currentX;
		  point.y = convertToDpi(point.y);
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'v':
		  point.x = currentX;
		  point.y = convertToDpi(point.y) + currentY;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'C':
		  point.x1 = convertToDpi(point.x1);
		  point.y1 = convertToDpi(point.y1);
		  point.x2 = convertToDpi(point.x2);
		  point.y2 = convertToDpi(point.y2);
		  point.x = convertToDpi(point.x);
		  point.y = convertToDpi(point.y);
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'c':
		  point.x1 = convertToDpi(point.x1) + currentX;
		  point.y1 = convertToDpi(point.y1) + currentY;
		  point.x2 = convertToDpi(point.x2) + currentX;
		  point.y2 = convertToDpi(point.y2) + currentY;
		  point.x = convertToDpi(point.x) + currentX;
		  point.y = convertToDpi(point.y) + currentY;
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		  case 'S':
			if ('x2' in point && 'y2' in point) {
			  point.x2 = convertToDpi(point.x2);
			  point.y2 = convertToDpi(point.y2);
			  point.x = convertToDpi(point.x);
			  point.y = convertToDpi(point.y);
			} else {
			  // 处理只有2个坐标的情况
			  point.x = convertToDpi(point.x);
			  point.y = convertToDpi(point.y);
			}
			currentX = point.x;
			currentY = point.y;
			pointList.push(point);
			break;
		  case 's':
			if ('x2' in point && 'y2' in point) {
			  point.x2 = convertToDpi(point.x2) + currentX;
			  point.y2 = convertToDpi(point.y2) + currentY;
			  point.x = convertToDpi(point.x) + currentX;
			  point.y = convertToDpi(point.y) + currentY;
			} else {
			  // 处理只有2个坐标的情况
			  point.x = convertToDpi(point.x) + currentX;
			  point.y = convertToDpi(point.y) + currentY;
			}
			currentX = point.x;
			currentY = point.y;
			pointList.push(point);
			break;
		case 'Q':
		  point.x1 = convertToDpi(point.x1);
		  point.y1 = convertToDpi(point.y1);
		  point.x = convertToDpi(point.x);
		  point.y = convertToDpi(point.y);
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'q':
		  point.x1 = convertToDpi(point.x1) + currentX;
		  point.y1 = convertToDpi(point.y1) + currentY;
		  point.x = convertToDpi(point.x) + currentX;
		  point.y = convertToDpi(point.y) + currentY;
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'T':
		  point.x = convertToDpi(point.x);
		  point.y = convertToDpi(point.y);
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 't':
		  point.x = convertToDpi(point.x) + currentX;
		  point.y = convertToDpi(point.y) + currentY;
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'A':
		  point.rx = convertToDpi(point.rx);
		  point.ry = convertToDpi(point.ry);
		  point.x = convertToDpi(point.x);
		  point.y = convertToDpi(point.y);
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'a':
		  point.rx = convertToDpi(point.rx);
		  point.ry = convertToDpi(point.ry);
		  point.x = convertToDpi(point.x) + currentX;
		  point.y = convertToDpi(point.y) + currentY;
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'B':
		  point.x1 = convertToDpi(point.x1);
		  point.y1 = convertToDpi(point.y1);
		  point.x2 = convertToDpi(point.x2);
		  point.y2 = convertToDpi(point.y2);
		  point.x = convertToDpi(point.x3);
		  point.y = convertToDpi(point.y3);
		  currentX = point.x;
		  currentY = point.y;
		  pointList.push(point);
		  break;
		case 'Z':
		case 'z':
		  pointList.push(point);
		  break;
	  }
	}
	return pointList;
  }

export const calPathPoint2 = function (abbreviatedPoint: any) {
	let pointList = [];

	for (let i = 0; i < abbreviatedPoint.length; i++) {
		let point = abbreviatedPoint[i];
		if (point.type === 'M' || point.type === 'L' || point.type === 'C') {
			let x = 0, y = 0;
			x = point.x;
			y = point.y;
			point.x = convertToDpi(x);
			point.y = convertToDpi(y);
			pointList.push(point);
		} else if (point.type === 'B') {
			let x1 = point.x1, y1 = point.y1;
			let x2 = point.x2, y2 = point.y2;
			let x3 = point.x3, y3 = point.y3;
			let realPoint = {
				'type': 'B', 'x1': convertToDpi(x1), 'y1': convertToDpi(y1),
				'x2': convertToDpi(x2), 'y2': convertToDpi(y2),
				'x3': convertToDpi(x3), 'y3': convertToDpi(y3)
			}
			pointList.push(realPoint);
		}
	}
	return pointList;
}

let decoder: any;
const
	haveU8 = (typeof Uint8Array == 'function');
export const decodeBase64String = (value: string) => {
	let i;
	if (decoder === undefined) {
		let b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
			ignore = '= \f\n\r\t\u00A0\u2028\u2029';
		decoder = [];
		for (i = 0; i < 64; ++i)
			decoder[b64.charCodeAt(i)] = i;
		for (i = 0; i < ignore.length; ++i)
			decoder[ignore.charCodeAt(i)] = -1;
		// RFC 3548 URL & file safe encoding
		decoder['-'.charCodeAt(0)] = decoder['+'.charCodeAt(0)];
		decoder['_'.charCodeAt(0)] = decoder['/'.charCodeAt(0)];
	}
	let out = haveU8 ? new Uint8Array(value.length * 3 >> 2) : [];
	let bits = 0, char_count = 0, len = 0;
	for (i = 0; i < value.length; ++i) {
		let c = value.charCodeAt(i)
		if (c == 61) // '='.charCodeAt(0)
			break;
		c = decoder[c];
		if (c == -1)
			continue;
		if (c === undefined)
			throw 'Illegal character at offset ' + i;
		bits |= c;
		if (++char_count >= 4) {
			out[len++] = (bits >> 16);
			out[len++] = (bits >> 8) & 0xFF;
			out[len++] = bits & 0xFF;
			bits = 0;
			char_count = 0;
		} else {
			bits <<= 6;
		}
	}
	switch (char_count) {
		case 1:
			throw 'Base64 encoding incomplete: at least 2 bits missing';
		case 2:
			out[len++] = (bits >> 10);
			break;
		case 3:
			out[len++] = (bits >> 16);
			out[len++] = (bits >> 8) & 0xFF;
			break;
	}
	if (haveU8 && out.length > len) // in case it was originally longer because of ignored characters
		out = out.subarray(0, len);
	return out;
}


export const Uint8ArrayToHexString = (arr: any) => {
	let words: any[] = [];
	let j = 0;
	for (let i = 0; i < arr.length * 2; i += 2) {
		words[i >>> 3] |= parseInt(arr[j], 10) << (24 - (i % 8) * 4);
		j++;
	}

	// 转换到16进制
	let hexChars = [];
	for (let i = 0; i < arr.length; i++) {
		let bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
		hexChars.push((bite >>> 4).toString(16));
		hexChars.push((bite & 0x0f).toString(16));
	}

	return hexChars.join('');
}
