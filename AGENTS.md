<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- AI calls live in `src/lib/ai.server.ts` (Lovable AI Gateway, Responses API, streamed) and are exposed only via auth-protected server functions in `src/lib/ai.functions.ts` — keeps keys and prompts server-side.
- Unsaved drafts/outputs use `useDraft` (`src/lib/workspace-store.ts`, sessionStorage-backed) so inputs survive tab switches; persisted data lives in `tasks` and `generations` tables with per-user RLS.
