import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
const dir = new URL("./public/icons/", import.meta.url);
mkdirSync(dir, {recursive:true});
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i=0;i<8;i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, bytes) {
  const t=Buffer.from(type);
  const length=Buffer.alloc(4); length.writeUInt32BE(bytes.length);
  const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t,bytes])));
  return Buffer.concat([length,t,bytes,crc]);
}
function generate(size) {
  const pixels=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++) {
    pixels[y*(size*4+1)]=0;
    for(let x=0;x<size;x++) {
      const u=x/size,v=y/size;
      const inside=Math.abs(u-.5)<.33 && Math.abs(v-.5)<.33;
      const cap=v>.28 && v<.52 && Math.abs(u-.5)<(.52-v)*.9;
      const book=v>.50 && v<.73 && Math.abs(u-.5)<.22;
      const gold=cap || (v>.50 && v<.73 && Math.abs(u-.5)<.235 && !book);
      const white=book;
      const color=gold?[214,178,115]:white?[247,249,253]:[20,40,68];
      const offset=y*(size*4+1)+1+x*4;
      pixels[offset]=color[0];pixels[offset+1]=color[1];pixels[offset+2]=color[2];pixels[offset+3]=255;
    }
  }
  const header=Buffer.alloc(13);
  header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(pixels)),chunk("IEND",Buffer.alloc(0))]);
  writeFileSync(new URL(`./public/icons/icon-${size}.png`,import.meta.url),png);
}
generate(192);
generate(512);
