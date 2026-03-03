
module.exports = {
  countByType(events) {
    const counts = {}
    for (const e of events) counts[`${e?.category || ''}|${e?.subcategory || ''}`] = (counts[`${e?.category || ''}|${e?.subcategory || ''}`] || 0) + 1
    return counts
  },

  getMostFrequent(counts) {
    let top = { key: null, count: 0 }
    for (const [key, count] of Object.entries(counts)) if (count > top.count) top = { key, count }
    return top
  },

  filterByType(events, typeKey) {
    const [cat, sub] = typeKey.split('|')
    return events.filter(e => e?.category === cat && e?.subcategory === sub)
  }
}
