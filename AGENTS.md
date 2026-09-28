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

- Keep Paragon Salon as the only active workspace, identified by its fixed salon ID in booking and access logic; legacy salon rows stay isolated to avoid destroying customer data.
- New management accounts require approval by the existing Paragon owner before a staff role is granted; sign-up alone never authorizes access.
- Use the semantic light mint palette in `src/styles.css` for every screen so booking and management stay visually consistent.
