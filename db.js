function base64Decode (base64) {
  const binary_string = window.atob(base64)
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i)
  }
  return bytes
}

function base64Encode (byteArray) {
  let binaryString = ''
  for (let i = 0; i < byteArray.byteLength; i++) {
    binaryString += String.fromCharCode(byteArray[i])
  }
  return btoa(binaryString)
}

class RingBuffer {
  constructor () {
    this.rb = new Array(65536)
    this.head = new Uint16Array(1)
    this.tail = new Uint16Array(1)
    this.length = 0
  }

  at (index) {
    return this.rb[this.head[0] + index]
  }

  push (fn) {
    if (this.length === 65536) this.shift()
    this.rb[this.tail[0]++] = fn
    this.length++
  }

  shift () {
    this.length--
    return this.rb[this.head[0]++]
  }
}

class Database {
  workerPath = ''
  wasmPath = ''
  worker = null
  queue = new RingBuffer()
  pageCache = null

  constructor (workerPath = 'worker.js') {
    this.workerPath = workerPath
    this.worker = new Worker(workerPath, { type: 'module' })
    this.worker.onmessage = e => {
      if (e.data.errorMessage) {
        this.onError && this.onError(e.data.errorMessage)
        return
      }
      this.queue.shift()(e.data)
    }
    this.worker.onerror = err => {
      console.error(err.stack)
    }
    this.worker.postMessage({})
  }

  close () {
    this.worker.postMessage({ close: this.fileName })
    return new Promise(resolve => this.queue.push(resolve))
  }

  async open (fileName, prefetch = false) {
    const message = { open: fileName, wasm: this.wasmPath }
    if (prefetch) {
      const req = await fetch(fileName, { headers: new Headers([['Range', 'bytes=0-4095']]), cors: true })
      if (req.status === 206) {
        const buf = await req.arrayBuffer()
        const view = new DataView(buf)
        const u8 = new Uint8Array(buf)
        const pageSize = view.getUint16(16)
        const totalPages = view.getUint32(28)
        const dbSize = pageSize * totalPages
        // can use SharedArrayBuffer here if we set the CORS headers
        //const sb = new SharedArrayBuffer(dbSize)
        const sb = new ArrayBuffer(dbSize)
        const sbytes = new Uint8Array(sb)
        sbytes.set(u8, 0)
        this.pageCache = sb
        message.cache = this.pageCache
        message.dbSize = dbSize
        message.pageSize = pageSize
        message.totalPages = totalPages
      }
    }
    this.worker.postMessage(message)
    this.fileName = fileName
    return new Promise(resolve => this.queue.push(resolve))
  }

  exec (sql) {
    this.worker.postMessage({ sql, db: this.fileName })
    return new Promise(resolve => this.queue.push(resolve))
  }

  query (query) {
    this.worker.postMessage({ query, db: this.fileName })
    return new Promise(resolve => this.queue.push(resolve))
  }

  checkpoint (name = 'main', wal) {
    this.worker.postMessage({ checkpoint: true, db: this.fileName, name, wal })
    return new Promise(resolve => this.queue.push(resolve))
  }

  serialize (name = 'main') {
    this.worker.postMessage({ name, serialize: true, db: this.fileName })
    return new Promise(resolve => this.queue.push(resolve))
  }

  deserialize (buf, name = 'main') {
    this.worker.postMessage({ name, buf, deserialize: true, db: this.fileName })
    return new Promise(resolve => this.queue.push(resolve))
  }

  status () {
    this.worker.postMessage({ status: true, db: this.fileName })
    return new Promise(resolve => this.queue.push(resolve))
  }

  memory () {
    this.worker.postMessage({ memory: true, db: this.fileName })
    return new Promise(resolve => this.queue.push(resolve))
  }

  pages () {
    this.worker.postMessage({ pages: true, db: this.fileName })
    return new Promise(resolve => this.queue.push(resolve))
  }

  async load () {
    const b64 = localStorage.getItem('plstatzdb')
    if (b64) {
      await this.deserialize(base64Decode(b64).buffer)
    }
  }

  async save () {
    const result = await this.serialize()
    const b64 = base64Encode(new Uint8Array(result.db))
    const version = (await this.exec('pragma user_version')).rows[0].user_version
    localStorage.setItem('plstatzversion', version)
    localStorage.setItem('plstatzdb', b64)
  }

  async versions () {
    const { rows } = await this.exec('pragma user_version')
    const remote = rows[0].user_version
    const local = parseInt(localStorage.getItem('plstatzversion') || 1000000, 10)
    return { local, remote }
  }
}

export { Database }
