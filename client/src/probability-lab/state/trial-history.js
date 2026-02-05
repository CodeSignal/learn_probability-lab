const CHUNK_SIZE = 8192;
const CHUNK_SHIFT = 13; // log2(8192)
const CHUNK_MASK = CHUNK_SIZE - 1;

export class IndexHistory {
  constructor() {
    this.length = 0;
    this._chunks = [];
  }

  clear() {
    this.length = 0;
    this._chunks.length = 0;
  }

  push(value) {
    const index = this.length;
    const chunkIndex = index >> CHUNK_SHIFT;
    const offset = index & CHUNK_MASK;

    let chunk = this._chunks[chunkIndex];
    if (!chunk) {
      chunk = new Uint16Array(CHUNK_SIZE);
      this._chunks[chunkIndex] = chunk;
    }

    chunk[offset] = value;
    this.length += 1;
  }

  get(i) {
    if (!Number.isInteger(i) || i < 0 || i >= this.length) return null;
    const chunk = this._chunks[i >> CHUNK_SHIFT];
    if (!chunk) return null;
    return chunk[i & CHUNK_MASK];
  }
}

export class PackedPairHistory {
  constructor() {
    this.length = 0;
    this._chunks = [];
  }

  clear() {
    this.length = 0;
    this._chunks.length = 0;
  }

  pushPair(a, b) {
    const packed = ((a & 0xffff) << 16) | (b & 0xffff);
    const index = this.length;
    const chunkIndex = index >> CHUNK_SHIFT;
    const offset = index & CHUNK_MASK;

    let chunk = this._chunks[chunkIndex];
    if (!chunk) {
      chunk = new Uint32Array(CHUNK_SIZE);
      this._chunks[chunkIndex] = chunk;
    }

    chunk[offset] = packed >>> 0;
    this.length += 1;
  }

  getPacked(i) {
    if (!Number.isInteger(i) || i < 0 || i >= this.length) return null;
    const chunk = this._chunks[i >> CHUNK_SHIFT];
    if (!chunk) return null;
    return chunk[i & CHUNK_MASK] >>> 0;
  }

  getPair(i) {
    const packed = this.getPacked(i);
    if (packed === null) return null;
    return { a: packed >>> 16, b: packed & 0xffff };
  }
}

