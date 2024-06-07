const bytesConversion = {
  kilobytes: 1024,
  megabytes: 1024 ** 2,
  gigabytes: 1024 ** 3
}

module.exports = (bytes, targetUnit) => {
  return bytes / bytesConversion[targetUnit];
}
