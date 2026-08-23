/**
 * Dynamic SEO & Metadata manager for FlipEnglish SPA
 */

export interface PageMetadata {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: 'website' | 'article';
}

export function updatePageSEO(metadata: PageMetadata) {
  if (typeof document === 'undefined') return;

  // 1. Update Title
  document.title = metadata.title;

  // 2. Update Meta Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', metadata.description);

  // 3. Update Open Graph Title & Description
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', metadata.title);

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);
  }
  ogDesc.setAttribute('content', metadata.description);

  // 4. Update Canonical Link
  const baseOrigin = 'https://flipenglish.app';
  const canonicalUrl = metadata.canonicalPath
    ? `${baseOrigin}${metadata.canonicalPath.startsWith('/') ? '' : '/'}${metadata.canonicalPath}`
    : baseOrigin;

  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);
}
