export default function SandboxLoading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-center gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gray-200" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-10 w-40 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}
