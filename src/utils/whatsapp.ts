import { toWhatsAppDigits } from './phone';

export function whatsAppGreeting(firstName: string, destination: string): string {
  return `Hi ${firstName}, saw your JunctionShare ping about ${destination}. Still good for a carpool?`;
}

/** `wa.me` URL, or null when the number is not WhatsApp-routable. */
export function whatsAppChatUrl(phoneRaw: string, message: string): string | null {
  const digits = toWhatsAppDigits(phoneRaw);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
