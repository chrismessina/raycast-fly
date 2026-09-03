export function timeAgo(date: string | number): string {
  const now = Date.now();
  const then = typeof date === "number" ? date : new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function formatISODate(date: string): string {
  return date.replace("T", " ").replace("Z", " UTC");
}

export function formatVmSize(vmSize: { name: string; memoryMb: number; memoryGb: number }): string {
  const mem = vmSize.memoryGb < 1 ? `${vmSize.memoryMb}MB` : `${vmSize.memoryGb}GB`;
  return `${vmSize.name}@${mem}`;
}
