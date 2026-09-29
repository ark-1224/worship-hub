// Centered card used by the login / join / password screens.
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
      <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-accent-700">
        Worship Hub
      </p>
      <div className="card">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 mb-5 text-stone-600">{subtitle}</p>}
        <div className={subtitle ? "" : "mt-5"}>{children}</div>
      </div>
    </main>
  );
}
