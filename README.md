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

### Uploading from scripts and agents

Anything that can make HTTP requests can attach files, without hosting them
anywhere: ask for an upload URL, `PUT` the file to it, then submit. Send the
API key (`API_KEYS`) as `x-api-key` on every call.

```sh
# 1. an upload URL for one file (valid for an hour)
curl -s https://etc.contributions.app/api/upload \
  -H "x-api-key: $KEY" -H "content-type: application/json" \
  -d '{"action":"presign","repo":"tweets-eth_classic","contribution":"tweet",
       "field":"video","name":"clip.mp4"}'
# => { "method": "PUT", "uploadUrl": "https://vercel.com/api/blob/?…",
#      "maxBytes": 536870912, "url": "https://….blob.vercel-storage.com/…",
#      "item": { "url": "…", "source": "upload", "kind": "video", … } }

# 2. the file itself: one plain PUT, no other headers needed
curl -T clip.mp4 "$UPLOAD_URL"

# 3. submit, with `item` (plus optional "alt") as the field's value
curl -s https://etc.contributions.app/api/contribute -H "x-api-key: $KEY" \
  -d '{"repo":"tweets-eth_classic","contribution":"tweet","authorization":"api",
       "text":"Watch this","video":[{ …item, "alt":"A short clip" }]}'
```

- `contentType` may be given; otherwise it comes from `name` (`.mp4`, `.jpg`,
  `.png`, `.webp`, `.gif`). The upload URL only accepts that type, up to the
  field's size limit, once.
- `field` is the form field: for tweets `video`, or `media` (a list of up to 4
  images) when images are stored in the Blob store. Fields that accept links
  (`remoteUrl`) also take `{ "url": "https://…", "source": "remote" }`
  without uploading anything.
- JavaScript clients can use the Blob SDK instead, for resumable multipart
  uploads: `{"action":"token", …, "size": <bytes>, "contentType": "video/mp4"}`
  returns `{ token, pathname }` for `@vercel/blob/client`'s `put` /
  `createMultipartUpload` with `access: "public"`.
- Images kept in the repository (`storage: "repo"`, as for ETC tweets) are
  sent inline instead: `"media": [{ "data": "data:image/png;base64,…",
"type": "png", "alt": "…" }]` (PNG or JPEG); the whole request must stay
  under Vercel's 4.5MB limit.
- The server checks every file when the contribution is submitted. Uploads
  that no pull request uses are deleted after `media.orphanGraceDays`.
