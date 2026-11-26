/// <reference types="vite/client" />
/// <reference types="w3c-web-hid" />

declare module 'gifuct-js' {
  export interface ParsedFrame {
    dims: { top: number; left: number; width: number; height: number }
    colorTable: [number, number, number][]
    delay: number
    disposalType: number
    patch: Uint8ClampedArray
  }
  export function parseGIF(buffer: ArrayBuffer): unknown
  export function decompressFrames(parsedGif: unknown, buildImagePatches: boolean): ParsedFrame[]
}
