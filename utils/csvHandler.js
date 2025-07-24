const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');

const getCsvPath = (filename) => path.join(__dirname, '..', 'data', filename);

function readCsv(filename) {
  const filePath = getCsvPath(filename);
  return new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true }))
      .on('data', (row) => records.push(row))
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

function writeCsv(filename, records) {
  const filePath = getCsvPath(filename);
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filePath);
    csv.write(records, { headers: true })
      .pipe(ws)
      .on('finish', resolve)
      .on('error', reject);
  });
}

module.exports = {
  readCsv,
  writeCsv
};
