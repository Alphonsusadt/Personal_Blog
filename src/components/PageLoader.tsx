export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-[#E5E7EB] dark:border-[#334155]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1E40AF] dark:border-t-[#60A5FA] animate-spin" />
        </div>
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Loading...</p>
      </div>
    </div>
  );
}
