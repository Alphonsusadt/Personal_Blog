/**
 * Computes a deterministic category background color based on the category name/slug.
 * This ensures that custom categories get a designed pastel color block in light mode,
 * and a rich, dark, desaturated background in dark mode, matching the rest of the site's aesthetics.
 */
export function getDeterministicCategoryColor(category: string): string {
  const colors = [
    'bg-block-lime',
    'bg-block-lilac',
    'bg-block-cream',
    'bg-block-pink',
    'bg-block-mint',
    'bg-block-coral'
  ];

  // Hash the category string to get a consistent index
  let hash = 0;
  const cleanCat = (category || '').trim().toLowerCase();
  for (let i = 0; i < cleanCat.length; i++) {
    hash = cleanCat.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
