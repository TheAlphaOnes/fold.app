@AGENTS.md

# Copy and line breaking (attention to detail)

Any copy that can wrap (empty states, notes, hints, dialogs, captions) must
break into even lines. Never leave one or two words alone on the last line.

- Use `<BalancedText>` (`src/components/balanced-text.tsx`) for wrapping copy.
  The app's face is monospaced, so `balanceLines` breaks it exactly.
- Short labels that must stay on one line get `numberOfLines={1}`.
- After any UI change with text, look at the screenshot for orphans, uneven
  lines, clipping and truncation before calling it done.
