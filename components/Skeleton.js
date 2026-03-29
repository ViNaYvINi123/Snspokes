// Skeleton loading components for all pages

export function SkeletonBox({ width = '100%', height = '20px', radius = '8px', style = {} }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: radius, background: 'linear-gradient(90deg, #1e1e2e 25%, #2a2a3e 50%, #1e1e2e 75%)', backgroundSize: '200% 100%', ...style }} />
  );
}

export function SpokeCardSkeleton() {
  return (
    <div style={{ padding: '24px', background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        <SkeletonBox width="48px" height="48px" radius="12px" />
        <div style={{ flex: 1 }}>
          <SkeletonBox width="60%" height="16px" radius="4px" style={{ marginBottom: '8px' }} />
          <SkeletonBox width="40%" height="12px" radius="4px" />
        </div>
      </div>
      <SkeletonBox width="100%" height="12px" radius="4px" style={{ marginBottom: '6px' }} />
      <SkeletonBox width="85%" height="12px" radius="4px" style={{ marginBottom: '16px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <SkeletonBox width="80px" height="12px" radius="4px" />
        <SkeletonBox width="60px" height="12px" radius="4px" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '14px', border: '1px solid #1e1e2e' }}>
      <SkeletonBox width="32px" height="32px" radius="8px" style={{ marginBottom: '12px' }} />
      <SkeletonBox width="60%" height="28px" radius="6px" style={{ marginBottom: '8px' }} />
      <SkeletonBox width="80%" height="12px" radius="4px" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <SkeletonBox width={i === 0 ? '80%' : '60%'} height="14px" radius="4px" />
        </td>
      ))}
    </tr>
  );
}
