const ANCHOR_GAP = 12;

export function scrollToSection(selector: string) {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) return;

  if (selector === '#hero') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.replaceState(null, '', selector);
    return;
  }

  const navBar = document.querySelector('nav > div') as HTMLElement | null;
  const navHeight = navBar?.getBoundingClientRect().height ?? 0;
  const styles = window.getComputedStyle(target);
  const sectionPadding = target.tagName.toLowerCase() === 'section'
    ? parseFloat(styles.paddingTop) || 0
    : 0;

  const top = window.scrollY + target.getBoundingClientRect().top + sectionPadding - navHeight - ANCHOR_GAP;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: 'smooth',
  });
  window.history.replaceState(null, '', selector);
}
