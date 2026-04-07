import Link from "next/link";

export default function Test3Page() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Test 3
      </h1>
      <p className="text-center text-zinc-600 dark:text-zinc-400">
        Basic test page for routing and navigation checks.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50"
      >
        ← Home
      </Link>
    </div>
  );
}
