function isNumeric (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

class VTable {
  constructor (table, head, body, container, keys, rows) {
    this.table = table
    this.head = head
    this.body = body
    this.container = container
    this.keys = keys
    this.rows = rows
    this.direction = 'asc'
    this.settings = {
      pvalues: false,
      zscores: false,
      exclude: 1,
      titles: {},
      display: 1000
    }
  }

  show () {
    const { container } = this
    if (container.children.length) container.removeChild(container.children[0])
    container.appendChild(this.table)
    return this
  }

  hide () {
    return this
  }

  update () {
    if (this.settings.pvalues) {
      this.pvalues()
      return this
    }
    if (this.settings.zscores) {
      this.zscores()
      return this
    }
    const keyLen = this.keys.length
    const rowLen = Math.min(this.rows.length, this.settings.display)
    const rows = this.body.children
    for (let i = 0; i < rowLen; i++) {
      for (let j = 0; j < keyLen; j++) {
        rows[i].cells[j + 1].innerText = this.rows[i][this.keys[j]]
      }
    } 
    return this
  }

  highlight () {
    const rowLen = Math.min(this.rows.length, this.settings.display)
    for (let i = 0; i < rowLen; i++) {
      if (this.rows[i].highlighted) {
        rows[i].highlight()
      }
    }
  }

  pvalues (exclude = this.settings.exclude) {
    const tRows = this.body.children
    const { rows, keys } = this
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j]
      if (j < exclude) continue
      if (isNumeric(rows[0][key])) {
        const zscores = stats.zScores(rows.map(row => row[key]))
        const rowLen = Math.min(rows.length, this.settings.display)
        for (let i = 0; i < rowLen; i++) {
          const zscore = zscores[i]
          const pv = Math.floor((stats.pValue(zscore) * 10000)) / 100
          tRows[i].cells[j].innerHTML = gaugeHtml(pv)
          tRows[i].cells[j].title = `${pv.toFixed(0)}th percentile\n${this.settings.titles[key] || key}`
        }
      }
    }
    return this
  }

  zscores (exclude = this.settings.exclude) {
    const tRows = this.body.children
    const { rows, keys } = this
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j]
      if (j < exclude) continue
      if (isNumeric(rows[0][key])) {
        const zscores = stats.zScores(rows.map(row => row[key]))
        const rowLen = Math.min(rows.length, this.settings.display)
        for (let i = 0; i < rowLen; i++) {
          const zscore = zscores[i]
          const pvalue = Math.floor((stats.pValue(zscore) * 10000)) / 100
          let pv = 0
          if (pvalue > 50) {
            pv = (50 - (pvalue - 50)) * 2
          } else {
            pv = (pvalue * 2)
          }
          tRows[i].cells[j + 1].innerHTML = gaugeHtml(zscore, pv, 'rgba(255, 210, 142, 1)')
          tRows[i].cells[j + 1].title = `${zscore.toFixed(0)}th zscore\n${this.settings.titles[key] || key}`
        }
      }
    }
    return this
  }

  sort (key) {
    const keyLen = this.keys.length
    const rowLen = Math.min(this.rows.length, this.settings.display)
    const rows = this.body.children
    // todo - fix this - it's very inefficient
    for (let i = 0; i < rowLen; i++) {
      if (this.rows[i].highlighted) {
        rows[i].highlight()
        this.rows[i].highlighted = true
      }
    }
    if (this.direction === 'desc') {
      this.rows.sort((a, b) => {
        const [ av, bv ] = [a[key], b[key]]
        if (av > bv) return 1
        if (av < bv) return -1
        return 0
      })
      this.direction = 'asc'
    } else {
      this.rows.sort((a, b) => {
        const [ av, bv ] = [a[key], b[key]]
        if (av > bv) return -1
        if (av < bv) return 1
        return 0
      })
      this.direction = 'desc'
    }
    for (let i = 0; i < rowLen; i++) {
      for (let j = 0; j < keyLen; j++) {
        rows[i].cells[j].innerText = this.rows[i][this.keys[j]]
      }
      if (this.rows[i].highlighted) {
        rows[i].highlight()
      }
    }
    return this
  }

  onRowClick (tRow, row) {
    tRow.highlight()
  }

  onHeaderClick (key) {
    this.sort(key)
    this.update()
  }
}

function gaugeHtml (value, percent = value, color = 'rgba(169, 245, 154, 1)') {
  return `<div style="min-width: 40px; color: black;">
  <div style="background-color: ${color}; text-align: left; width: ${Math.ceil(percent)}%">
  ${value.toFixed(2)}
  </div>
  </div>`
}

function showTable (keys, rows, container, settings = {}) {
  // change this so keys is optional and defaulted
  const table = document.createElement('table')
  const head = table.createTHead()
  const body = table.createTBody()
  const newRow = head.insertRow(-1)
  newRow.classList.add('header')

//  const newCell = document.createElement('th')
//  newCell.innerText = 'rank'
//  newRow.appendChild(newCell)
  keys = keys.filter(k => !settings.hidden.includes(k))
  const vtable = new VTable(table, head, body, container, keys, rows)
  Object.assign(vtable.settings, settings)
  let j = 0
  for (const key of keys) {
    const newCell = document.createElement('th')
    newCell.style.cursor = 'pointer'
    newCell.innerText = key
    newRow.appendChild(newCell)
    newCell.title = vtable.settings.titles[key] || ''
    newCell.onclick = () => vtable.onHeaderClick.call(vtable, key)
  }
  let rank = 1
  let i = 0
  for (const row of rows) {
    if (i === vtable.settings.display) break
    const newRow = body.insertRow(-1)
    newRow.style.cursor = 'pointer'
    newRow.onclick = () => vtable.onRowClick.call(vtable, newRow, rows[newRow.index])
    newRow.index = i++
    row.tRow = newRow
    newRow.highlight = (color = '#f7f0f0') => {
      const row = rows[newRow.index]
      if (newRow.style.backgroundColor === 'white' || newRow.style.backgroundColor === '') {
        row.tRow = newRow
        newRow.style.backgroundColor = color
        newRow.style.opacity = 0.7
        row.highlighted = true
      } else {
        newRow.style.backgroundColor = 'white'
        newRow.style.opacity = 1
        row.highlighted = false
      }
    }
//    const newCell = newRow.insertCell(-1)
//    const newText = document.createTextNode(rank++)
//    newCell.appendChild(newText)
    for (const key of keys) {
      const newCell = newRow.insertCell(-1)
      const newText = document.createTextNode(row[key])
      newCell.title = row[key]
      newCell.appendChild(newText)
    }
  }
  return vtable
}

function getAge (age) {
  return `${age} yo`
}

function getPosition (pos) {
  if (pos === 'D') return 'Defender'
  if (pos === 'F') return 'Forward'
  if (pos === 'M') return 'Midfielder'
  if (pos === 'G') return 'GoalKeeper'
  return 'Unknown'
}

function feetAndInches (cm) {
  let inches = Math.floor(cm * 0.393701)
  const feet = Math.floor(inches / 12)
  inches = inches % 12
  return `${feet}ft ${inches}in`
}

function stonesAndPounds (kg) {
  let pounds = Math.floor(kg * 2.20462)
  const stones = Math.floor(pounds / 14)
  pounds = pounds % 14
  return `${stones}st ${pounds}lb`
}

function gaugeHtmlRight (percent, { bgcolor = '#aaffaa', color = 'black' }) {
  return `<div style="min-width: 40px; color: black;">
  <div style="color: ${color}; background-color: ${bgcolor}; text-align: left; width: ${Math.ceil(percent)}%">
  ${(percent || 0).toFixed(2)}
  </div>
  </div>`
}

function gaugeHtmlLeft (percent, { bgcolor = '#aaffaa', color = 'black' }) {
  return `<div style="min-width: 40px; display: flex; justify-content: flex-end; color: black;">
  <div style="direction: rtl; color: ${color}; background-color: ${bgcolor}; text-align: right; width: ${Math.ceil(percent)}%">
  ${(percent || 0).toFixed(2)}
  </div>
  </div>`
}

function showComparison (player1, player2, allPlayers1, allPlayers2, descriptions, container, hiddenFields = []) {

  function addSeparator (classes = []) {
    row = body.insertRow(-1)
    row.classList.add('separator')
    for (const cl of classes) row.classList.add(cl)
  }

  function addFieldAndHeader (fieldName, title, classes = [], formatter) {
    row = body.insertRow(-1)
    row.classList.add('row')

    cell = row.insertCell(-1)
    cell.classList.add('header')
    cell.classList.add('right')
    for (const cl of classes) cell.classList.add(cl)
    let text = document.createTextNode(formatter ? formatter(player1[fieldName]) : player1[fieldName])
    cell.appendChild(text)

    cell = row.insertCell(-1)
    cell.classList.add('statsub')
    cell = row.insertCell(-1)
    text = document.createTextNode(title)
    cell.classList.add('statsub')
    cell.appendChild(text)
    cell = row.insertCell(-1)
    cell.classList.add('statsub')

    cell = row.insertCell(-1)
    cell.classList.add('header')
    cell.classList.add('left')
    for (const cl of classes) cell.classList.add(cl)
    text = document.createTextNode(formatter ? formatter(player2[fieldName]) : player2[fieldName])
    cell.appendChild(text)
  }

  function addFieldAndMetric (fieldName, statName, classes = [], formatter, decimal = true) {
    row = body.insertRow(-1)
    row.classList.add('row')

    cell = row.insertCell(-1)
    cell.classList.add('header')
    cell.classList.add('right')
    for (const cl of classes) cell.classList.add(cl)
    text = document.createTextNode(formatter ? formatter(player1[fieldName]) : player1[fieldName])
    cell.appendChild(text)

    const zscores1 = stats.zScores(allPlayers1.map(p => p[statName]))
    const ids1 = allPlayers1.map(p => p.pid)
    const scores1 = {}
    for (let i = 0; i < ids1.length; i++) {
      scores1[ids1[i]] = zscores1[i]
    }
    const pv1 = Math.floor((stats.pValue(scores1[player1.pid]) * 10000)) / 100


    const zscores2 = stats.zScores(allPlayers2.map(p => p[statName]))
    const ids2 = allPlayers2.map(p => p.pid)
    const scores2 = {}
    for (let i = 0; i < ids2.length; i++) {
      scores2[ids2[i]] = zscores2[i]
    }
    const pv2 = Math.floor((stats.pValue(scores2[player2.pid]) * 10000)) / 100

    const diff = pv2 - pv1

    cell = row.insertCell(-1)
    if (decimal) {
      text = document.createTextNode(player1[statName].toFixed(2))
    } else {
      text = document.createTextNode(player1[statName])
    }
    cell.classList.add('value')
    cell.classList.add('right')
    cell.appendChild(text)

    cell = row.insertCell(-1)
    text = document.createTextNode(descriptions[statName])
    cell.classList.add('gauge')
    if (diff < 0) {
      cell.classList.add('gaugeleft')
    } else {
      cell.classList.add('gaugeright')
    }
    cell.style.backgroundSize = `${Math.abs(diff)}%`
    cell.appendChild(text)

    cell = row.insertCell(-1)
    if (decimal) {
      text = document.createTextNode(player2[statName].toFixed(2))
    } else {
      text = document.createTextNode(player2[statName])
    }
    cell.classList.add('value')
    cell.classList.add('left')
    cell.appendChild(text)

    cell = row.insertCell(-1)
    cell.classList.add('header')
    cell.classList.add('left')
    for (const cl of classes) cell.classList.add(cl)
    text = document.createTextNode(formatter ? formatter(player2[fieldName]) : player2[fieldName])
    cell.appendChild(text)
  }

  function addField (fieldName, classes = [], formatter, showImages = false) {
    row = body.insertRow(-1)
    row.classList.add('row')

    cell = row.insertCell(-1)
    cell.classList.add('header')
    cell.classList.add('right')
    for (const cl of classes) cell.classList.add(cl)
    text = document.createTextNode(formatter ? formatter(player1[fieldName]) : player1[fieldName])
    cell.appendChild(text)

    cell = row.insertCell(-1)
    if (showImages) {
      cell.classList.add('image')
      cell.classList.add('right')
      getTeamImage(player1.tid, cell)
    }

    cell = row.insertCell(-1)
    cell.classList.add('label')

    cell = row.insertCell(-1)
    if (showImages) {
      cell.classList.add('image')
      cell.classList.add('left')
      getTeamImage(player2.tid, cell)
    }

    cell = row.insertCell(-1)
    cell.classList.add('header')
    cell.classList.add('left')
    for (const cl of classes) cell.classList.add(cl)
    text = document.createTextNode(formatter ? formatter(player2[fieldName]) : player2[fieldName])
    cell.appendChild(text)
  }

  function colorGradient (pv, negative) {
    const g = negative ? gradient2 : gradient
    const h = negative ? gradient : gradient2
    if (pv >= 99) {
      return { bgcolor: g[11], color: 'white' }
    } else if (pv >= 95) {
      return { bgcolor: g[10], color: 'white' }
    } else if (pv >= 90) {
      return { bgcolor: g[9], color: 'white' }
    } else if (pv >= 80) {
      return { bgcolor: g[8], color: 'white' }
    } else if (pv >= 70) {
      return { bgcolor: g[6], color: 'white' }
    } else if (pv >= 60) {
      return { bgcolor: g[4], color: 'black' }
    } else if (pv >= 50) {
      return { bgcolor: g[2], color: 'black' }
    } else if (pv >= 40) {
      return { bgcolor: h[0], color: 'black' }
    } else if (pv >= 30) {
      return { bgcolor: h[2], color: 'black' }
    } else if (pv >= 20) {
      return { bgcolor: h[4], color: 'white' }
    } else if (pv >= 10) {
      return { bgcolor: h[6], color: 'white' }
    } else {
      return { bgcolor: h[8], color: 'white' }
    }
  }

  function addMetric (field, negative = false) {
    let color = '#aaffaa'
    if (negative) color = 'rgb(236, 173, 171)'
    let cell, text


    const zscores1 = stats.zScores(allPlayers1.map(p => p[field]))
    const ids1 = allPlayers1.map(p => p.pid)
    const scores1 = {}
    for (let i = 0; i < ids1.length; i++) {
      scores1[ids1[i]] = zscores1[i]
    }
    const pv1 = Math.floor((stats.pValue(scores1[player1.pid]) * 10000)) / 100


    const zscores2 = stats.zScores(allPlayers2.map(p => p[field]))
    const ids2 = allPlayers2.map(p => p.pid)
    const scores2 = {}
    for (let i = 0; i < ids2.length; i++) {
      scores2[ids2[i]] = zscores2[i]
    }
    const pv2 = Math.floor((stats.pValue(scores2[player2.pid]) * 10000)) / 100

    const diff = pv2 - pv1
    const row = body.insertRow(-1)
    if (hiddenFields[field]) {
      row.classList.add('selectrowsel')
    } else {
      row.classList.add('selectrow')
    }
    row.onclick = (color = 'red') => {
      if (row.classList.contains('selectrow')) {
        row.classList.remove('selectrow')
        row.classList.add('selectrowsel')
        hiddenFields[field] = true
      } else {
        row.classList.remove('selectrowsel')
        row.classList.add('selectrow')
        delete hiddenFields[field]
      }
    }

    cell = row.insertCell(-1)
    cell.classList.add('header')
    cell.classList.add('right')
    cell.innerHTML = gaugeHtmlLeft(pv1, colorGradient(pv1, negative))

    cell = row.insertCell(-1)
    text = document.createTextNode(player1[field].toFixed(2))
    cell.classList.add('value')
    cell.classList.add('right')
    cell.appendChild(text)

    cell = row.insertCell(-1)
    text = document.createTextNode(descriptions[field])
    cell.classList.add('gauge')
    if (diff < 0) {
      cell.classList.add('gaugeleft')
    } else {
      cell.classList.add('gaugeright')
    }
    cell.style.backgroundSize = `${Math.abs(diff)}%`
    cell.appendChild(text)

    cell = row.insertCell(-1)
    text = document.createTextNode(player2[field].toFixed(2))
    cell.classList.add('value')
    cell.classList.add('left')
    cell.appendChild(text)

    cell = row.insertCell(-1)
    cell.classList.add('header')
    cell.classList.add('left')
    cell.innerHTML = gaugeHtmlRight(pv2, colorGradient(pv2, negative))
  }

  function addHeader (title, type = 'statsub') {
    const row = body.insertRow(-1)
    row.classList.add(type)

    let cell = row.insertCell(-1)
    cell.classList.add('header')
    cell.classList.add('right')

    cell = row.insertCell(-1)
    cell.classList.add(type)

    cell = row.insertCell(-1)
    const text = document.createTextNode(title)
    cell.classList.add(type)
    cell.appendChild(text)

    cell = row.insertCell(-1)
    cell.classList.add(type)

    cell = row.insertCell(-1)
    cell.classList.add('header')
    cell.classList.add('left')
  }

  const table = document.createElement('table')
  table.classList.add('player')
  const body = table.createTBody()
  let cell, text, row, img

  addField('name', ['playername'], null, true)

  addFieldAndHeader('team', 'overall', ['teamname'])
  addFieldAndMetric('age', 'mins', [], getAge, false)
  addFieldAndMetric('pos', 'goal', [], getPosition, false)
  addFieldAndMetric('ht', 'asst', [], feetAndInches, false)
  addFieldAndMetric('wt', 'npgt', [], stonesAndPounds, false)

  let fieldNames = ['goal', 'asst', 'npgt']
  const gradient = ["#F0F0F0","#DDE5DB","#C9DAC6","#B6CEB1","#A3C39C","#8FB887","#7CAD72","#68A25D","#559748","#428B33","#2E801E","#1B7509"]
  const gradient2 = ["#F0F0F0","#E8DCDC","#E0C8C8","#D8B3B3","#D09F9F","#C88B8B","#C07777","#B86363","#B04F4F","#A83A3A","#A02626","#981212"]
  const fields = Object.keys(descriptions).filter(field => !fieldNames.includes(field))

  addHeader('attacking')
  for (const field of ['gls', 'npg', 'npgi', 'rat', 'fod', 'pes']) {
    addMetric(field)
  }
  for (const field of ['pem', 'off', 'mis', 'dis']) {
    addMetric(field, true)
  }
  addHeader('creation')
  for (const field of ['ast', 'chc', 'kyp', 'taa', 'rtaa']) {
    addMetric(field)
  }
  addHeader('passing')
  for (const field of ['pat', 'pbw', 'pfw', 'pas', 'pac', 'pfc', 'rpas', 'rpbw', 'rpfw']) {
    addMetric(field)
  }
  addHeader('hustle/involvement')
  for (const field of ['tch', 'cow', 'int', 'rec']) {
    addMetric(field)
  }
  addHeader('aerial')
  for (const field of ['hdr', 'rhdr']) {
    addMetric(field)
  }
  addHeader('physical/defending')
  for (const field of ['chl', 'blk', 'hcl', 'clr', 'tka', 'rtka']) {
    addMetric(field)
  }
  for (const field of ['coc', 'fou']) {
    addMetric(field, true)
  }
  addHeader('goalkeeping')
  addMetric('sav')

  const div = document.createElement('div')
  div.classList.add('player')
  div.appendChild(table)
  container.appendChild(div)
  return div
}

function getTeamImage (tid, container) {
  if (!window.settings.images) return
  if (!window.imagesInitialized) {
    db.exec('attach database \'images.db\' as images')
      .then(() => {
        window.imagesInitialized = true
        getTeamImage(tid, container)
      })
    return
  }
  if (allTeams[tid]) {
    container.appendChild(allTeams[tid].img)
  } else {
    const img = document.createElement('img')
    img.classList.add('team')
    db.exec(`select * from images.team where id = ${tid}`)
      .then(({ ok, rows }) => {
        const [ team ] = rows
        allTeams[team.id] = team
        const b64 = btoa(String.fromCharCode.apply(null, team.image))
        delete team.image
        img.src = `data:image/png;base64,${b64}`
        //img.src = `https://omo.akamai.opta.net/image.php?secure=true&h=omo.akamai.opta.net&sport=football&entity=team&description=badges&dimensions=150&id=${tid}`
        team.img = img
        container.appendChild(img)
      })
  }
}

function setupStats () {
  const arr = {
    max: function (array) {
      return Math.max.apply(null, array)
    },
    min: function (array) {
      return Math.min.apply(null, array)
    },
    range: function (array) {
      return arr.max(array) - arr.min(array)
    },
    midrange: function (array) {
      return arr.range(array) / 2
    },
    sum: function (array) {
      let num = 0
      for (let i = 0, l = array.length; i < l; i++) num += array[i]
      return num
    },
    mean: function (array) {
      return arr.sum(array) / array.length
    },
    median: function (array) {
      array.sort(function (a, b) {
        return a - b
      })
      const mid = array.length / 2
      return mid % 1 ? array[mid - 0.5] : (array[mid - 1] + array[mid]) / 2
    },
    modes: function (array) {
      if (!array.length) return []
      const modeMap = {}
      let maxCount = 0
      let modes = []
      array.forEach(function (val) {
        if (!modeMap[val]) {
          modeMap[val] = 1
        } else {
          modeMap[val]++
        }
        if (modeMap[val] > maxCount) {
          modes = [val]
          maxCount = modeMap[val]
        } else if (modeMap[val] === maxCount) {
          modes.push(val)
          maxCount = modeMap[val]
        }
      })
      return modes
    },
    variance: function (array) {
      const mean = arr.mean(array)
      return arr.mean(array.map(function (num) {
        return Math.pow(num - mean, 2)
      }))
    },
    standardDeviation: function (array) {
      return Math.sqrt(arr.variance(array))
    },
    meanAbsoluteDeviation: function (array) {
      const mean = arr.mean(array)
      return arr.mean(array.map(function (num) {
        return Math.abs(num - mean)
      }))
    },
    zScores: function (array) {
      const mean = arr.mean(array)
      const standardDeviation = arr.standardDeviation(array)
      return array.map(function (num) {
        return (num - mean) / standardDeviation
      })
    }
  }

  function swap (data, i, j) {
    if (i === j) {
      return
    }
    const tmp = data[j]
    data[j] = data[i]
    data[i] = tmp
  }

  function partition (data, start, end) {
    let i
    let j
    for (i = start + 1, j = start; i < end; i++) {
      if (data[i] < data[start]) {
        swap(data, i, ++j)
      }
    }
    swap(data, start, j)
    return j
  }

  function findK (data, s, e, k) {
    let start = s
    let end = e
    while (start < end) {
      const pos = partition(data, start, end)
      if (pos === k) {
        return data[k]
      }
      if (pos > k) {
        end = pos
      } else {
        start = pos + 1
      }
    }
    return null
  }

  const percentile = (data, n) => {
    return findK(data.concat(), 0, data.length, Math.ceil((data.length * n) / 100) - 1)
  }


  function pValue (zscore) {
    if ( zscore < -6.5) return 0.0
    if( zscore > 6.5) return 1.0
    var factK = 1
    var sum = 0
    var term = 1
    var k = 0
    var loopStop = Math.exp(-23)
    while(Math.abs(term) > loopStop)  {
      term = .3989422804 * Math.pow(-1,k) * Math.pow(zscore,k) / (2 * k + 1) / Math.pow(2, k) * Math.pow(zscore, k+1) / factK
      sum += term
      k++
      factK *= k
    }
    sum += 0.5
    return sum
  }  

  arr.average = arr.mean
  arr.percentile = percentile
  arr.pValue = pValue
  return arr
}

const stats = setupStats()
const allTeams = {}

export { showTable, showComparison, getTeamImage }
