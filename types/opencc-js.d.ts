/**
 * 为 opencc-js cn2t / t2cn 提供类型声明（包无 .d.ts）。
 * @author poetry
 */
declare module "opencc-js/cn2t" {
  export function Converter(options: { from: string; to: string }): (text: string) => string;
}
declare module "opencc-js/t2cn" {
  export function Converter(options: { from: string; to: string }): (text: string) => string;
}
