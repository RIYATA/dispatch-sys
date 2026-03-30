/**
 * Detect Chinese mobile carrier based on phone number prefix
 * @param phoneNumber - 11-digit Chinese mobile number
 * @returns Carrier name or '未知'
 */
export const detectCarrier = (phoneNumber: string): string => {
 if (!phoneNumber || phoneNumber.length < 3) return '未知';

 const prefix = phoneNumber.substring(0, 3);

 // China Mobile (中国移动)
 const mobilePrefixes = ['134', '135', '136', '137', '138', '139', '147', '150', '151', '152', '157', '158', '159', '172', '178', '182', '183', '184', '187', '188', '198'];
 if (mobilePrefixes.includes(prefix)) {
  return '中国移动';
 }

 // China Unicom (中国联通)
 const unicomPrefixes = ['130', '131', '132', '145', '155', '156', '166', '171', '175', '176', '185', '186'];
 if (unicomPrefixes.includes(prefix)) {
  return '中国联通';
 }

 // China Telecom (中国电信)
 const telecomPrefixes = ['133', '149', '153', '173', '177', '180', '181', '189', '199'];
 if (telecomPrefixes.includes(prefix)) {
  return '中国电信';
 }

 return '未知';
};

/**
 * Determine if a phone number belongs to a competitor carrier (not China Telecom)
 * @param phoneNumber - 11-digit Chinese mobile number
 * @returns true if it's a non-telecom user
 */
export const isCompetitor = (phoneNumber: string): boolean => {
 const carrier = detectCarrier(phoneNumber);
 return carrier !== '中国电信' && carrier !== '未知';
};

/**
 * Parse date string from various formats to YYYY-MM-DD
 * @param timeStr - Time string (e.g. "2023-11-21 14:00", "11月21日", "11.21")
 * @returns YYYY-MM-DD string or empty string
 */
export const getTaskDate = (timeStr: string | null): string => {
 if (!timeStr) return '';

 // Try YYYY-MM-DD first
 const isoMatch = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
 if (isoMatch) return isoMatch[0];

 // Try MM月DD日
 const cnMatch = timeStr.match(/(\d+)\s*月\s*(\d+)\s*日/);
 if (cnMatch) {
  const month = cnMatch[1].padStart(2, '0');
  const day = cnMatch[2].padStart(2, '0');
  const year = new Date().getFullYear();
  return `${year}-${month}-${day}`;
 }

 // Try MM.DD or MM/DD or MM-DD (without year)
 const shortMatch = timeStr.match(/^(\d{1,2})[.\/-](\d{1,2})/);
 if (shortMatch) {
  const month = shortMatch[1].padStart(2, '0');
  const day = shortMatch[2].padStart(2, '0');
  const year = new Date().getFullYear();
  return `${year}-${month}-${day}`;
 }

 return timeStr.split(' ')[0];
};

/**
 * List of available projects/communities
 */
export const PROJECTS = ['合富明珠', '滨江豪庭', '御景阳光小区', '清华花园三期', '江山御花园智社'];
