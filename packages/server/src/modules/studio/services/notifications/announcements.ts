/** The Studio distribution does not use hosted announcements. */
export async function fetchStudioAnnouncements(_localeInput: unknown): Promise<unknown> {
  return { ok: false, disabled: true, error: 'feature_disabled', announcements: [] }
}
