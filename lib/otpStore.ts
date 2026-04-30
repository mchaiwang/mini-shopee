const otpStore: Record<string, { otp: string; expires: number }> = {};

export function setOTP(email: string, otp: string) {
  otpStore[email] = {
    otp,
    expires: Date.now() + 5 * 60 * 1000, // 5 นาที
  };
}

export function getOTP(email: string) {
  const data = otpStore[email];

  if (!data) return null;

  if (Date.now() > data.expires) {
    delete otpStore[email];
    return null;
  }

  return data.otp;
}

export function clearOTP(email: string) {
  delete otpStore[email];
}