# NepaliOS hosting proof: real Next.js

The capstone check from CLAUDE.md's services roadmap: a real Next.js app,
built and run on NepaliOS's real Debian base (extends `nepali-os:dev` -
build that from the repo root first).

```bash
# from the repo root
docker build -t nepali-os:dev .

# from this directory
docker build -t nepali-nextjs-demo .
docker run --rm -p 3000:3000 nepali-nextjs-demo
```

Then, in another terminal:

```bash
curl http://localhost:3000/
```

The page (`app/page.jsx`) is deliberately marked `dynamic = "force-dynamic"`
and embeds a real server-computed timestamp - run the `curl` twice a second
apart and the timestamp in the response genuinely differs, proving this is
a live server-side render on every request, not a cached static file. This
was verified for real during development (see the git log around this
file), including cross-checking a real standalone Go `net/http` server the
same way (two requests, two different real timestamps) - Rust hosting is
already proven by `nepali-fileserver` itself, a real production Rust HTTP
service this OS ships.
