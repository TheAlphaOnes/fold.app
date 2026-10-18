import { router, type Href } from 'expo-router';

/**
 * Go back if there is history; otherwise go to `fallback`.
 *
 * A screen opened from a deep link, a share or a notification is the first
 * entry in the stack, so a bare router.back() has nowhere to go and is
 * dropped (dev builds log "GO_BACK was not handled"). Every back/close
 * control uses this instead.
 */
export function goBack(fallback: Href = '/'): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
