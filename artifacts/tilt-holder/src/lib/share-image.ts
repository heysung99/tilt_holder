export function shareOrDownloadBlob(blob: Blob, fileName: string, shareTitle?: string) {
  const downloadViaLink = () => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
  const file = new File([blob], fileName, { type: blob.type || 'image/png' });
  // Omitting `title` when the caller doesn't pass one keeps share sheets (e.g. KakaoTalk)
  // from attaching caption text alongside the image — just the picture gets shared.
  const shareData: ShareData = shareTitle ? { files: [file], title: shareTitle } : { files: [file] };
  if (nav.canShare && nav.canShare(shareData)) {
    navigator.share(shareData).catch(() => {
      // Share sheet dismissed or unsupported mid-flight; fall back to a direct download.
      downloadViaLink();
    });
    return;
  }

  downloadViaLink();
}

type TemporaryStyles = Partial<Record<'overflow' | 'width' | 'maxHeight', string>>;

// Applies inline styles for the duration of a capture; the returned function puts
// the element back exactly as it was.
export function withTemporaryStyles(element: HTMLElement, styles: TemporaryStyles) {
  const previous = Object.fromEntries(Object.keys(styles).map((key) => [key, element.style[key as keyof TemporaryStyles]]));
  Object.assign(element.style, styles);
  return () => {
    Object.assign(element.style, previous);
  };
}

function formatShareDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Captures the element as rendered on screen and hands it to the share sheet (or a
// download). Descendants marked data-share-exclude="true" (buttons) are left out, and
// today's date is stamped into the data-share-date-slot="true" element, if any.
export async function shareElementImage(node: HTMLElement, fileName: string, options: { width?: number } = {}) {
  const dateSlot = node.querySelector<HTMLElement>('[data-share-date-slot="true"]');
  const dateLabel = document.createElement('span');
  dateLabel.textContent = formatShareDate(new Date());
  Object.assign(dateLabel.style, {
    fontFamily: "'Space Mono', monospace",
    fontSize: '12px',
    fontWeight: '700',
    color: '#a0a4b1',
  });
  dateSlot?.insertBefore(dateLabel, dateSlot.firstChild);

  try {
    // Let any layout changes the caller just made reflow before capturing.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const { toBlob } = await import('html-to-image');
    const blob = await toBlob(node, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width: options.width,
      filter: (domNode) => !(domNode instanceof HTMLElement && domNode.dataset.shareExclude === 'true'),
    });
    if (blob) shareOrDownloadBlob(blob, fileName);
  } catch (error) {
    console.error(error);
  } finally {
    dateLabel.remove();
  }
}
