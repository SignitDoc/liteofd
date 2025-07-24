// 导入 liteofd 文件夹下的所有模块
import LiteOfd from './liteofd/liteOfd';
import { OfdRender } from './liteofd/ofdRender';
import { OfdDocument } from './liteofd/ofdDocument';
import { OfdPageContainer } from './liteofd/elements/ofdPageContainer';
import { PathSvg } from './liteofd/elements/PathSvg';
import { OfdPageRender } from './liteofd/elements/ofdPageRender';
import { SignatureElement } from './liteofd/elements/SignatureElement';
import { TextSvg } from './liteofd/elements/TextSvg';
import {TextElement} from "./liteofd/elements/TextElement"
import { ImageSvg } from './liteofd/elements/ImageSvg';
import { AnnotLayer } from './liteofd/annotLayer';
import { ContentLayer } from './liteofd/contentLayer';
import Layer from './liteofd/layer';
import * as parser from './liteofd/parser';
import { AttributeKey, OFD_KEY, OFD_ACTION, ANNOT_TYPE, MultiChildTagName } from './liteofd/attrType';
import * as ofdFont from './liteofd/ofdFont';
import { rendererConfig } from './liteofd/rendererConfig';

// 导出所有模块
export {
  LiteOfd,
  OfdRender,
  OfdDocument,
  OfdPageContainer,
  PathSvg,
  OfdPageRender,
  SignatureElement,
  TextSvg,
  TextElement,
  ImageSvg,
  AnnotLayer,
  ContentLayer,
  Layer,
  parser,
  AttributeKey,
  OFD_KEY,
  OFD_ACTION,
  ANNOT_TYPE,
  MultiChildTagName,
  ofdFont,
  rendererConfig
};
