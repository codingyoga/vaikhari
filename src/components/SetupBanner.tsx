interface Props {
  hasKey: boolean;
}

export function SetupBanner({ hasKey }: Props) {
  if (hasKey) return null;
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
          !
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-200">
            Anthropic API key not set
          </p>
          <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
            Vaikhari needs a Claude API key to polish your speech. Get one at{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-amber-100"
            >
              console.anthropic.com
            </a>
            , then create a <code className="px-1 py-0.5 rounded bg-ink-900 text-amber-200">.env</code> file
            in the project root with{" "}
            <code className="px-1 py-0.5 rounded bg-ink-900 text-amber-200">
              ANTHROPIC_API_KEY=sk-ant-...
            </code>{" "}
            and restart the server.
          </p>
        </div>
      </div>
    </div>
  );
}
