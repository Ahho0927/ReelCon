interface SavedStyle {
  element: HTMLElement;
  opacity: string;
  visibility: string;
  pointerEvents: string;
  transition: string;
}

function nearlyMatchesVideo(rect: DOMRect, videoRect: DOMRect): boolean {
  const widthDelta = Math.abs(rect.width - videoRect.width);
  const heightDelta = Math.abs(rect.height - videoRect.height);
  return widthDelta <= Math.max(12, videoRect.width * 0.08) &&
    heightDelta <= Math.max(12, videoRect.height * 0.08);
}

function findMediaRoot(video: HTMLVideoElement): HTMLElement {
  const videoRect = video.getBoundingClientRect();
  let root: HTMLElement = video;
  let current = video.parentElement;

  while (current && current !== document.body) {
    const rect = current.getBoundingClientRect();
    if (!nearlyMatchesVideo(rect, videoRect)) break;
    root = current;
    current = current.parentElement;
  }

  return root;
}

export class OverlayHider {
  private saved: SavedStyle[] = [];
  private hiddenElements = new Set<HTMLElement>();
  private root: HTMLElement | null = null;
  private video: HTMLVideoElement | null = null;
  private observer = new MutationObserver(() => this.hideCurrentBranches());

  hide(video: HTMLVideoElement): void {
    this.restore();
    this.video = video;
    this.root = findMediaRoot(video);
    this.observer.observe(this.root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'],
    });
    this.hideCurrentBranches();
  }

  restore(): void {
    this.observer.disconnect();
    this.root = null;
    this.video = null;
    for (const item of this.saved) {
      item.element.style.opacity = item.opacity;
      item.element.style.visibility = item.visibility;
      item.element.style.pointerEvents = item.pointerEvents;
      item.element.style.transition = item.transition;
    }
    this.saved = [];
    this.hiddenElements.clear();
  }

  private hideCurrentBranches(): void {
    const { root, video } = this;
    if (!root || !video || !root.contains(video)) return;
    let branch: HTMLElement | null = root;

    while (branch && branch !== video) {
      const next: Element | undefined = Array.from(branch.children).find((child) => child.contains(video));
      if (!(next instanceof HTMLElement)) break;

      for (const sibling of Array.from(branch.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === next) continue;
        this.hideElement(sibling);
      }
      branch = next;
    }
  }

  private hideElement(element: HTMLElement): void {
    if (!this.hiddenElements.has(element)) {
      this.hiddenElements.add(element);
      this.saved.push({
        element,
        opacity: element.style.opacity,
        visibility: element.style.visibility,
        pointerEvents: element.style.pointerEvents,
        transition: element.style.transition,
      });
    }
    this.ensureImportantStyle(element, 'opacity', '0');
    this.ensureImportantStyle(element, 'visibility', 'hidden');
    this.ensureImportantStyle(element, 'pointer-events', 'none');
    this.ensureImportantStyle(element, 'transition', 'none');
  }

  private ensureImportantStyle(element: HTMLElement, property: string, value: string): void {
    if (
      element.style.getPropertyValue(property) === value &&
      element.style.getPropertyPriority(property) === 'important'
    ) {
      return;
    }
    element.style.setProperty(property, value, 'important');
  }
}
