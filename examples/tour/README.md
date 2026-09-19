# The tour: learn the Nepali language step by step

Fourteen short programs, in order. Each has a sibling `.out` file with its
exact output, and `cargo test --test tour` (in `crates/nepali-core`) runs them
all through the real CLI, so nothing here can silently go out of date. For a
keyword and builtin cheat-sheet see [`../README.md`](../README.md).

## Run one

```bash
# from the repo root
cargo run --release --manifest-path crates/nepali-core/Cargo.toml -- examples/tour/01_namaste.nep

# or with the built binary / the Nepali OS shell
nepali examples/tour/01_namaste.nep
```

Step 11 imports `lib/गणित.nep` relative to its own file, so it works from any
directory.

| # | File | You learn |
|---|------|-----------|
| 1 | [`01_namaste.nep`](01_namaste.nep) | printing, comments, Devanagari digits |
| 2 | [`02_variables.nep`](02_variables.nep) | `राखौँ`, numbers, text, `सहि`/`गलत`, `केहीछैन`, arithmetic |
| 3 | [`03_conditions.nep`](03_conditions.nep) | `यदि` / `नत्र` / `नत्र यदि`, `र` `वा` `होइन` |
| 4 | [`04_loops.nep`](04_loops.nep) | `भएसम्म`, nested loops |
| 5 | [`05_functions.nep`](05_functions.nep) | `काम`, `पठाउँ`, recursion, functions as values |
| 6 | [`06_arrays.nep`](06_arrays.nep) | arrays, indexing, `लम्बाइ`, `थप्नुहोस्` |
| 7 | [`07_strings.nep`](07_strings.nep) | `लम्बाइ`, `अक्षर`, `संकेत` (Unicode code points) |
| 8 | [`08_closures.nep`](08_closures.nep) | closures: counters, function factories |
| 9 | [`09_algorithms.nep`](09_algorithms.nep) | GCD, primes, FizzBuzz, bubble sort, binary search |
| 10 | [`10_romanized.nep`](10_romanized.nep) | the same language typed on any keyboard |
| 11 | [`11_modules.nep`](11_modules.nep) | `आयात` (uses [`lib/गणित.nep`](lib/गणित.nep)) |
| 12 | [`12_operating_system.nep`](12_operating_system.nep) | files, real commands, SQLite |
| 13 | [`13_interop.nep`](13_interop.nep) | Python, JavaScript, TypeScript |
| 14 | [`ai/14_ai.nep`](ai/14_ai.nep) | local AI: ask, speak, agent (needs models; only parse-checked) |

Things the tour shows that are easy to miss:

- There is no `break`; loop conditions decide when to stop.
- Text and array lengths count Unicode code points, so a vowel sign such as
  `ा` counts as one even though it is drawn attached to a letter (step 7).
- Errors stop the program with a message and exit code 1 (for example an array
  index past the end); they never crash it.
- `आदेश_चलाउनुहोस्(program, [args])` runs a program directly, not through a
  shell, so `$HOME` in the arguments stays literal text (step 12).
