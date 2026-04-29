/**
 * 이메일 형식이 유효한지 검사 (RFC 5322 기준 단순화)
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 비밀번호 복잡도 검사 (BR-11)
 * 최소 8자, 영문, 숫자, 특수문자 포함
 * @param {string} password
 * @returns {boolean}
 */
export function isValidPassword(password) {
  if (!password || password.length < 8) return false;

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return hasLetter && hasNumber && hasSpecial;
}

/**
 * 비어있지 않은 문자열인지 검사
 * @param {any} value
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 양의 정수인지 검사
 * @param {any} value
 * @returns {boolean}
 */
export function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * 유효한 날짜 형식(ISO 8601)인지 검사
 * @param {any} value
 * @returns {boolean}
 */
export function isValidDate(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  
  const date = new Date(value);
  return !isNaN(date.getTime());
}
