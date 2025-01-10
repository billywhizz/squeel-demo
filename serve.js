const fs = require('fs')
const path = require('path')
const express = require('express')
const https = require('https')

const options = {
  key: fs.readFileSync(path.join(__dirname, './key.pem')),
  cert: fs.readFileSync(path.join(__dirname, './cert.pem')),
}

const app = express()

app.use(express.static(path.join(__dirname, './web'), { lastModified: true, maxAge: 3600000 }))

const port = 443

https.createServer(options, app).listen(port, '0.0.0.0', function(){
  console.log("Express server listening on port " + port)
})
