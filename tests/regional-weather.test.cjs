const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const filename = path.resolve(__dirname, '../lib/regional-weather.ts')
const compiled = new Module(filename, module)
compiled.filename = filename
compiled.paths = module.paths
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { regionalObservations, formatObservationTime } = compiled.exports

const now = Date.parse('2026-09-23T14:15:00+08:00')
function data() {
  return {
    temperature: { recordTime: '2026-09-23T14:00:00+08:00', data: [
      { place: 'Sha Tin', value: 31, unit: 'C' },
      { place: 'Additional station', value: 28.4, unit: 'C' },
    ] },
    rainfall: { startTime: '2026-09-23T12:45:00+08:00', endTime: '2026-09-23T13:45:00+08:00', data: [
      { place: 'Sha Tin', min: 2, max: 8.5, unit: 'mm', main: 'FALSE' },
      { place: 'Wan Chai', max: 0, unit: 'mm', main: 'FALSE' },
    ] },
  }
}

test('uses API station names and values, and keeps station temperature separate from district maximum rain', () => {
  const result = regionalObservations(data(), now)
  assert.deepEqual(result.temperature.rows.map(row => [row.place, row.value]), [['Sha Tin', 31], ['Additional station', 28.4]])
  assert.deepEqual(result.rainfall.rows.map(row => [row.place, row.value]), [['Sha Tin', 8.5], ['Wan Chai', 0]])
  assert.equal(result.rainfall.rows[1].status, 'available')
  assert.equal(result.rainfall.startTime, '2026-09-23T12:45:00+08:00')
})

test('missing, non-numeric, or wrong-unit observations never become invented readings', () => {
  const input = data()
  input.temperature.data = [
    { place: 'Missing', unit: 'C' }, { place: 'String', value: '31', unit: 'C' },
    { place: 'Non-finite', value: NaN, unit: 'C' }, { place: 'Wrong unit', value: 88, unit: 'F' },
  ]
  input.rainfall.data = [
    { place: 'Null', max: null, unit: 'mm' }, { place: 'Negative', max: -1, unit: 'mm' },
    { place: 'Minimum only', min: 0, unit: 'mm' },
  ]
  const result = regionalObservations(input, now)
  for (const group of Object.values(result)) {
    assert.equal(group.status, 'unavailable')
    assert.ok(group.rows.every(row => row.value === null))
  }
})

test('maintenance flag hides rain values, including an apparent zero', () => {
  const input = data()
  input.rainfall.data[0].main = 'TRUE'
  input.rainfall.data[1].main = 'TRUE'
  const result = regionalObservations(input, now).rainfall
  assert.ok(result.rows.every(row => row.status === 'maintenance' && row.value === null))
})

test('old observations expire independently of the other feed', () => {
  const input = data()
  input.temperature.recordTime = '2026-09-23T11:00:00+08:00'
  const result = regionalObservations(input, now)
  assert.equal(result.temperature.status, 'stale')
  assert.ok(result.temperature.rows.every(row => row.value === null))
  assert.equal(result.rainfall.status, 'available')
  assert.equal(result.rainfall.rows[0].value, 8.5)
})

test('missing, future and reversed observation periods cannot be presented as live data', () => {
  for (const timestamp of [undefined, 'bad-date', '2026-09-24T14:00:00+08:00']) {
    const input = data()
    input.temperature.recordTime = timestamp
    assert.equal(regionalObservations(input, now).temperature.status, 'unavailable')
  }
  const input = data()
  input.rainfall.startTime = '2026-09-23T14:00:00+08:00'
  assert.equal(regionalObservations(input, now).rainfall.status, 'unavailable')
})

test('malformed or absent feeds do not create sample stations', () => {
  for (const input of [null, undefined, [], {}, { temperature: { data: {} } }]) {
    const result = regionalObservations(input, now)
    assert.equal(result.temperature.rows.length, 0)
    assert.equal(result.rainfall.rows.length, 0)
  }
})

test('times are explicitly formatted in Hong Kong time regardless of input timezone', () => {
  assert.match(formatObservationTime('2026-09-23T06:00:00Z'), /14:00 HKT$/)
  assert.equal(formatObservationTime(null), 'Time unavailable')
})
