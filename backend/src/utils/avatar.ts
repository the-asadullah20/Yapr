export const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20128%20128%22%3E%3Crect%20width%3D%22128%22%20height%3D%22128%22%20fill%3D%22%23CBD5E1%22%2F%3E%3Cpath%20d%3D%22M64%2028a22%2022%200%201%200%200%2044%2022%2022%200%200%200%200-44zm0%2054c-24%200-48%2012-48%2030v6h96v-6c0-18-24-30-48-30z%22%20fill%3D%22%23FFFFFF%22%2F%3E%3C%2Fsvg%3E';

export function getAvatarUrl(url?: string | null): string {
  if (!url || url.trim() === '' || url.includes('dicebear.com')) {
    return DEFAULT_AVATAR;
  }
  return url;
}
