import { open } from './sqlite.js'

const databases = {}

onmessage = async e => {
  if (e.data.query) {
    const start = Date.now()
    const db = databases[e.data.db]
    const query = db.query(e.data.sql)
    postMessage({ ok: true, query, time: Date.now() - start })
    return
  }
  if (e.data.sql) {
    const start = Date.now()
    const db = databases[e.data.db]
    const rows = db.exec(e.data.sql)
    postMessage({ ok: true, rows, time: Date.now() - start })
    return
  }
  if (e.data.open) {
    const { cache, dbSize, pageSize, totalPages } = e.data
    const db = await open(e.data.open, e.data.wasm || 'sqlite.wasm', {
      cache, dbSize, pageSize, totalPages
    })
    databases[e.data.open] = db
    postMessage({ ok: true })
    return
  }
  if (e.data.close) {
    databases[e.data.close].close(e.data.close)
    postMessage({ ok: true })
    return
  }
  if (e.data.checkpoint) {
    const db = databases[e.data.db]
    const name = e.data.name || 'main'
    if (e.data.wal) {
      const buf = e.data.wal
      const u8 = new Uint8Array(buf)
      const { wal } = db.databases[name]
      wal.file.write(u8, 0)
      wal.index.dirty()
      wal.file.offset = u8.length
    }
    const { rc, logSize, framesCheckpointed, checkpointSequence } = db.checkpoint(name)
    postMessage({ rc, logSize, framesCheckpointed, checkpointSequence, checkpoint: { wal: db.walInfo(name) } })
    return
  }
  if (e.data.serialize) {
    const db = databases[e.data.db]
    postMessage({ db: db.serialize(e.data.name) })
    return
  }
  if (e.data.deserialize) {
    const db = databases[e.data.db]
    postMessage({ db: db.deserialize(e.data.buf, e.data.name) })
    return
  }
  if (e.data.status) {
    const db = databases[e.data.db]
    postMessage(db.status())
    return
  }
  if (e.data.pages) {
    const db = databases[e.data.db]
    const pages = db.pages()
    postMessage(pages)
    return
  }
  if (e.data.memory) {
    const db = databases[e.data.db]
    postMessage(db.memoryUsed())
    return
  }
  if (e.data.close) {
    const db = databases[e.data.db]
    postMessage(db.close())
    return
  }
}
