const parseComplexTime = (rawStr) => {
  const result = { date: '', period: '', time: '' };
  if (!rawStr) return result;

  const dateMatch = rawStr.match(/(\d{4})?[-./年]?\s*(\d{1,2})\s*[-./月]\s*(\d{1,2})\s*[日]?/);
  if (dateMatch) {
    const year = dateMatch[1] || new Date().getFullYear();
    const month = dateMatch[2].padStart(2, '0');
    const day = dateMatch[3].padStart(2, '0');
    result.date = `${year}-${month}-${day}`;
  }

  const periodMatch = rawStr.match(/(上午|下午|晚上|全天)/);
  if (periodMatch) {
    result.period = periodMatch[1];
  }

  const timeMatch = rawStr.match(/(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?)/);
  if (timeMatch) {
    result.time = timeMatch[1];
    if (!result.period) {
      const startHour = parseInt(result.time.split(':')[0]);
      if (startHour < 12) result.period = '上午';
      else if (startHour < 18) result.period = '下午';
      else result.period = '晚上';
    }
  }
  return result;
};

const parseTextToRows = (text) => {
    if (!text.trim()) return [];

    const lines = text.trim().split('\n').filter(line => line.trim());
    const rows = [];

    lines.forEach((line, index) => {
      let parts;
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else {
        parts = line.split(/\s+/);
      }

      parts = parts.map(p => p.trim()).filter(p => p);

      if (parts.length >= 4) {
        const rawTime = parts[4] || '';
        const parsed = parseComplexTime(rawTime);
        
        rows.push({
          id: `paste-${index}`,
          name: parts[0] || '',
          phone: parts[1] || '',
          building: parts[2] || '',
          room: parts[3] || '',
          time: parsed.time || rawTime,
          period: parsed.period || parts[5] || '',
          note: parts[6] || '',
          date: parsed.date,
          timePeriod: parsed.period
        });
      }
    });

    return rows;
};

const input = "聂木妹\t13542907413\tC\tC1602\t11 月 21 日下午 15:00-17:30（星期五）";
const rows = parseTextToRows(input);
console.log('Parsed Rows:', JSON.stringify(rows, null, 2));

// Simulate submitImport logic
const row = rows[0];
let finalAppointmentTime = row.time || '';
if (row.date) {
    const parts = [row.date];
    if (row.period) parts.push(row.period);
    if (row.time && row.time !== row.date) parts.push(row.time);
    finalAppointmentTime = parts.join(' ');
}
console.log('Final Appointment Time:', finalAppointmentTime);
