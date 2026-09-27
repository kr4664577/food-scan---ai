// Public scan messages are selected locally, never copied from raw provider/network errors.
const messages: Record<string, string> = {
  AI_QUOTA_EXCEEDED: 'AI scanning is temporarily unavailable because the AI service has reached its usage limit. Please try again later.',
  AI_TEMPORARY_ERROR: 'The AI service is temporarily busy. Please try again in a moment.',
  AI_NETWORK_ERROR: 'Unable to connect to the AI service. Check your connection and try again.',
  AI_TIMEOUT: 'The scan took too long to complete. Please try again.',
  AI_INVALID_RESPONSE: "I couldn't confidently identify this food. Try a clearer photo with the food fully visible.",
  AI_UNKNOWN_ERROR: 'The AI service could not complete this scan. Please try again later.',
  FOOD_NOT_IDENTIFIED: "I couldn't confidently identify this food. Try a clearer photo with the food fully visible.",
  NON_FOOD_IMAGE: 'This image does not appear to contain food. Please choose a clear food photo.',
  INVALID_IMAGE: 'This image could not be read. Please choose a clear JPEG, PNG, or WebP photo.',
  APP_RATE_LIMITED: 'Too many requests to FoodScan. Please wait before trying again.',
};

const barcodeMessages = new Set([
  'This barcode does not appear to be a food product. Nutrition information is unavailable.',
  'This barcode could not be verified as food. Check the digits, retry, or upload a clear photo of the food label.',
  'Enter an 8, 12, 13, or 14 digit product barcode.',
]);

export function getFriendlyScanErrorMessage(error: any, barcode = false): string {
  const detail = error?.response?.data?.error;
  const code = typeof detail?.code === 'string' ? detail.code : '';
  if (messages[code]) {
    const remaining = detail?.retryAfterSeconds;
    const wait = error?.scanCooldown === true && Number.isFinite(remaining) && remaining > 0
      ? ` Please wait ${Math.ceil(remaining)} seconds before trying again.` : '';
    return messages[code] + wait;
  }
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code) || error?.name === 'TimeoutError') return messages.AI_TIMEOUT;
  if (!error?.response) return 'Unable to connect to the AI service. Check your connection and try again.';
  const status = error.response.status;
  if (status === 429) return messages.APP_RATE_LIMITED;
  if (status === 401) return 'Your session needs to be verified. Please sign in again before scanning.';
  if (status === 413) return 'This image is too large. Please choose a smaller photo.';
  if (status >= 500) return 'The FoodScan server is temporarily unavailable. Please try again in a moment.';
  if (barcode) {
    const message = typeof detail === 'string' ? detail : detail?.message;
    if (barcodeMessages.has(message)) return message;
    return 'Food barcode lookup could not be completed. Please check the digits and try again.';
  }
  return messages.AI_INVALID_RESPONSE;
}
