const parseComplexTime = (rawStr) => {
  const result = { date: '', period: '', time: '' };
  if (!rawStr) return result;

  // 1. Extract Date (MM.DD, MM/DD, MM月DD日)
  // Matches: 11.20, 11/20, 11月20日, 2025-11-20
  const dateMatch = rawStr.match(/(\d{4})?[-./年]?\s*(\d{1,2})\s*[-./月]\s*(\d{1,2})\s*[日]?/);
  if (dateMatch) {
    const year = dateMatch[1] || new Date().getFullYear();
    const month = dateMatch[2].padStart(2, '0');
    const day = dateMatch[3].padStart(2, '0');
    result.date = `${year}-${month}-${day}`;
  }

  // 2. Extract Period (上午, 下午, 晚上)
  const periodMatch = rawStr.match(/(上午|下午|晚上|全天)/);
  if (periodMatch) {
    result.period = periodMatch[1];
  }

  // 3. Extract Time Range (15:00-17:30, 15:00)
  const timeMatch = rawStr.match(/(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?)/);
  if (timeMatch) {
    result.time = timeMatch[1];

    // If period is missing but we have time, infer it
    if (!result.period) {
      const startHour = parseInt(result.time.split(':')[0]);
      if (startHour < 12) result.period = '上午';
      else if (startHour < 18) result.period = '下午';
      else result.period = '晚上';
    }
  }
  return result;
};

const input = "11 月 21 日下午 15:00-17:30（星期五）";
const parsed = parseComplexTime(input);
console.log('Input:', input);
console.log('Parsed:', parsed);

// Simulate handleImport logic
let finalAppointmentTime = parsed.time || '';
if (parsed.date) {
    const parts = [parsed.date];
    if (parsed.period) parts.push(parsed.period);
    if (parsed.time && parsed.time !== parsed.date) parts.push(parsed.time);
    finalAppointmentTime = parts.join(' ');
}
console.log('Final Appointment Time:', finalAppointmentTime);
