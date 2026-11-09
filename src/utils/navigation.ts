import { router, type Href } from 'expo-router';

import { createKeyedGuard } from '@/utils/press-guard';

/**
 * App navigation goes through here so a double tap can't open a screen
 * twice or pop two screens: the same navigation repeated within
 * NAV_GUARD_MS is dropped, while different ones (save, then go back) pass.
 */
const once = createKeyedGuard();
const keyOf = (href: Href) => (typeof href === 'string' ? href : JSON.stringify(href));

export const navigate = {
  push(href: Href): void {
    once(`push:${keyOf(href)}`, () => router.push(href));
  },
  replace(href: Href): void {
    once(`replace:${keyOf(href)}`, () => router.replace(href));
  },
  navigate(href: Href): void {
    once(`navigate:${keyOf(href)}`, () => router.navigate(href));
  },
};

/**
 * Go back if there is history; otherwise go to `fallback`.
 *
 * A screen opened from a deep link, a share or a notification is the first
 * entry in the stack, so a bare router.back() has nowhere to go and is
 * dropped (dev builds log "GO_BACK was not handled"). Every back/close
 * control uses this instead.
 */
export function goBack(fallback: Href = '/'): void {
  once('back', () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  });
}
