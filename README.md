# Work in Progress

## Media uploads (Vercel Blob)

Form fields can upload files straight from the browser to a
[Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store instead of
committing them to the repository, and can accept links to files elsewhere.

**Setup:** create a public Blob store and connect it to the Vercel project,
which sets `BLOB_READ_WRITE_TOKEN`. `NEXTAUTH_SECRET` signs upload sessions
and `CRON_SECRET` protects the cleanup cron.

**Fields**

- `type: "media"`: images and/or video, always uploaded to the Blob store.
  Options: `accept` (`["image", "video"]`), `max` (files, default 1),
  `maxSizeMB`, `alt`, `remoteUrl`.
- `type: "images"` / `"image"`: `storage: "repo"` (default, committed) or
  `"blob"`; `remoteUrl`.
- `remoteUrl`: `false` (default), `true` (any public https host) or a list of
  hosts (`["example.com", "*.example.com"]`). Links are checked on the server:
  https only, public addresses only, type and size.

Tweets: `tweet({ options: { media: { images: "repo" | "blob" | false, video:
true, maxVideoMB, remoteUrl } } })`. Media is written to the tweet file as
`media: - url: …`, which twitter-together downloads when publishing (its
`MEDIA_URL_HOSTS` must allow the Blob store and any linked hosts).

**Uploads** go in 8MB parts, three at a time, with retries and a progress bar.
Finished parts and the form draft are kept in the browser, so after a dropped
connection or a reload, choosing the same file again sends only the missing
parts. Uploading needs the same authorization as submitting; a solved captcha
covers both.

**Retention** (top-level or per repository):

```ts
media: {
  retentionDays: 90, // uploads used by merged pull requests; null = forever
  orphanGraceDays: 7, // uploads no open or merged pull request uses
}
```

`/api/cron/media-cleanup` runs daily (see `vercel.json`); `?dry=1` lists what
it would delete. Uploads of open pull requests are always kept. If tweets are
scheduled far ahead, keep `retentionDays` longer than that.
