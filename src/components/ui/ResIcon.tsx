import { getResourceSprite } from '@/lib/data/resources';

interface Props {
  resourceId: string;
  fallback?: string;
  size?: number;
  className?: string;
}

export function ResIcon({ resourceId, fallback = '?', size = 20, className = '' }: Props) {
  const sprite = getResourceSprite(resourceId);
  if (sprite) {
    return (
      <img
        src={sprite}
        alt={resourceId}
        width={size}
        height={size}
        className={`inline-block object-contain ${className}`}
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }
  return <span className={className}>{fallback}</span>;
}
