export default function AppliancesNewPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-16 dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        /appliances/new
      </h1>
      <p className="text-center text-zinc-600 dark:text-zinc-400">
        Redirect target for the Launch edge “Redirect to a URL” demo (
        <code className="text-sm">/appliances-redirect</code> → 301 here).
      </p>
    </div>
  );
}
