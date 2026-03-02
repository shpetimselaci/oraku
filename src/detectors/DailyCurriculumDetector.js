const DETECTOR_NAME = 'DailyCurriculumDetector'

function safeParseDate(dateValue) {
  try { return new Date(dateValue) } catch { return null }
}

function isToday(date) {
  const now = new Date()
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  )
}

module.exports = {
  name: DETECTOR_NAME,
  type: 'daily',
  dataSource: 'curriculum',

  description:
    'Checks today’s kindergarten curriculum and suggests activities to do at home if important developmental areas were not covered',

  async detect(curriculumData) {
    // Accept either a raw events array or a stitched entry object with `.events`
    const events = Array.isArray(curriculumData?.events)
      ? curriculumData.events
      : Array.isArray(curriculumData)
      ? curriculumData
      : []
    if (!events.length) return []

    const todaysItems = events.filter(item => {
      const d = safeParseDate(item.createdAt)
      return d && isToday(d)
    })

    if (!todaysItems.length) return []

    const EXPECTED_AREAS = [
      { key: 'reading', keywords: ['reading', 'story', 'storybook'] },
      { key: 'playing', keywords: ['play', 'free play', 'games'] },
      { key: 'movement', keywords: ['sports', 'football', 'running', 'gym', 'movement'] },
      { key: 'music', keywords: ['music', 'singing', 'songs'] },
      { key: 'art', keywords: ['drawing', 'painting', 'art', 'craft'] },
      { key: 'basics', keywords: ['letters', 'numbers', 'alphabet'] }
    ]

    const normalizedToday = todaysItems.map(item =>
      item.name?.toLowerCase() || ''
    )

    const coveredAreas = new Set()

    EXPECTED_AREAS.forEach(area => {
      if (
        normalizedToday.some(name =>
          area.keywords.some(keyword => name.includes(keyword))
        )
      ) {
        coveredAreas.add(area.key)
      }
    })

    const missingAreas = EXPECTED_AREAS
      .map(a => a.key)
      .filter(area => !coveredAreas.has(area))

    if (!missingAreas.length) return []

    // derive base id from externalRef or first item name to make files unique and descriptive
    const identifier = (curriculumData && curriculumData.externalRef)
      ? curriculumData.externalRef
      : (todaysItems[0]?.name || 'curriculum')
    const dateStr = new Date().toISOString().split('T')[0]
    return [{
      id: `${DETECTOR_NAME.toLowerCase()}-${identifier}-${dateStr}`,
      detector: DETECTOR_NAME,
      severity: 'suggestion',
      message:
        `Today’s curriculum did not include: ${missingAreas.join(', ')}. Consider doing one of these activities at home.`,
      evidence: todaysItems.map(item => ({
        name: item.name,
        createdAt: item.createdAt
      }))
    }]
  }
}