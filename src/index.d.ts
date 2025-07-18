// 导入并导出所有类型
import LiteOfd from './liteofd/liteOfd';
import { OfdRender } from './liteofd/ofdRender';
import { OfdDocument } from './liteofd/ofdDocument';
import { OfdPageContainer } from './liteofd/elements/ofdPageContainer';
import { PathSvg } from './liteofd/elements/PathSvg';
import { OfdPageRender } from './liteofd/elements/ofdPageRender';
import { SignatureElement } from './liteofd/elements/SignatureElement';
import { TextSvg } from './liteofd/elements/TextSvg';
import { ImageSvg } from './liteofd/elements/ImageSvg';
import { AnnotLayer } from './liteofd/annotLayer';
import { ContentLayer } from './liteofd/contentLayer';
import Layer from './liteofd/layer';
import * as parser from './liteofd/parser';
import { AttributeKey, OFD_KEY, OFD_ACTION, ANNOT_TYPE, MultiChildTagName } from './liteofd/attrType';
import * as ofdFont from './liteofd/ofdFont';
import { RendererConfig, rendererConfig } from './liteofd/rendererConfig';

export {
  LiteOfd,
  OfdRender,
  OfdDocument,
  OfdPageContainer,
  PathSvg,
  OfdPageRender,
  SignatureElement,
  TextSvg,
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
  RendererConfig,
  rendererConfig
};

// 默认导出
export default LiteOfd;
