const { writeFileSync } = require('node:fs')

const attrs = [
  { name: 'countryName', value: 'GB' },
  { shortName: 'ST', value: 'London' },
  { name: 'localityName', value: 'London' },
  { name: 'organizationName', value: 'billywhizz.io' },
  { name: 'commonName', value: 'home.billywhizz.io' },
];

const { private, cert } = require('selfsigned').generate(attrs, { days: 365 })

writeFileSync('cert.pem', cert)
writeFileSync('key.pem', private)
