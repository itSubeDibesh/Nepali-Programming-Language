# नेपाली भाषा उदाहरणहरू — Learn Nepali by example

Twenty small, numbered programs. Work through them in order: each one teaches
a single idea, with comments (in Nepali) that explain it. Every program has a
sibling `NN_name.expected` file holding its exact output, and
`cargo test` (see below) runs all of them, so nothing here can silently rot.

## Index / सूची

| # | File | शीर्षक (Nepali) | What it teaches |
|---|------|-----------------|-----------------|
| 01 | `01_hello.nep` | नमस्ते संसार | `भनौँ` printing, comments, statement endings, romanized `bhana` |
| 02 | `02_variables.nep` | चर | `राखौँ`, reassignment, number/string/bool/null, Devanagari digits |
| 03 | `03_arithmetic.nep` | अङ्कगणित | `+ - * / %`, precedence, parentheses, decimals |
| 04 | `04_conditions.nep` | सर्त | `यदि` / `नत्र यदि` / `नत्र`, comparison operators |
| 05 | `05_loops.nep` | लुप | `भएसम्म`, counting, sums, early exit via a flag (no `break`) |
| 06 | `06_functions.nep` | कार्य | `काम`, parameters, `पठाउँ`, functions as values |
| 07 | `07_recursion.nep` | पुनरावृत्ति | base case, factorial, power, GCD, digit sum |
| 08 | `08_arrays.nep` | सूची | literals, indexing, `लम्बाइ`, `थप्नुहोस्`, nesting, reference semantics |
| 09 | `09_strings.nep` | शब्द | `लम्बाइ` / `अक्षर` / `संकेत` over Unicode code points, reversing, counting |
| 10 | `10_logic.nep` | तार्किक सञ्चालक | `र` `वा` `होइन`, real short-circuiting, leap years |
| 11 | `11_closures.nep` | क्लोजर | inner functions capturing variables, counters, higher-order functions |
| 12 | `12_fizzbuzz.nep` | फिजबज | the classic, with `नत्र यदि` chains |
| 13 | `13_primes.nep` | मूळ सङ्ख्या | trial division, returning from inside a loop, building a list |
| 14 | `14_sorting.nep` | क्रमबद्ध | bubble sort, swapping array elements in place |
| 15 | `15_fibonacci.nep` | फिबोनाची | recursive vs loop implementations |
| 16 | `16_modules.nep` | मोड्युल | `आयात` of `lib/गणित.nep`, path resolution, double import |
| 17 | `17_files.nep` | फाइल | `ओएस_लेख्नुहोस्` / `ओएस_पढ्नुहोस्` / `ओएस_सूची` (uses and cleans `/tmp`) |
| 18 | `18_commands.nep` | आदेश | `आदेश_चलाउनुहोस्` returns `[exit_code, stdout, stderr]`; no shell injection |
| 19 | `19_database.nep` | डाटाबेस | real SQLite via `डाटाबेस_चलाउनुहोस्` / `डाटाबेस_सोध्नुहोस्` |
| 20 | `20_python_js_interop.nep` | पाइथन / जेएस | embedded Python, JavaScript and TypeScript engines |

Other directories here: `lib/` (helper module used by 16) and `hosting/`
(Next.js hosting demo). `tour/` and `native/` are separate collections; only
the top-level `NN_*.nep` files belong to this one.

## Running / कसरी चलाउने

```sh
# with the built binary (cargo build --release in crates/nepali-core)
nepali examples/01_hello.nep
# or, without installing:
crates/nepali-core/target/release/nepali-core-cli examples/01_hello.nep

# programs 19 (database) use $NEPALI_DB; point it at a scratch file if you like
NEPALI_DB=/tmp/scratch.db nepali examples/19_database.nep
```

In the Docker image (`nepali-os`) the `nepali` binary is the `ENTRYPOINT`, so
mount this directory and pass the script path:

```sh
docker run --rm -v "$PWD/examples:/examples" nepali-os /examples/01_hello.nep
```

In the bootable ISO, `nepali` is the login shell: copy or mount the files and
run `nepali 01_hello.nep` at the `nep:/home/nepali $` prompt. (The Docker/ISO
commands are documented from the Dockerfile and `os-image/`; the collection
itself is verified against the locally built binary by the test below.)
Program 20 needs the Python/JS bridges (Cargo features `python-interop` and
`js-interop`, on by default).

Verify the whole collection:

```sh
cd crates/nepali-core && cargo test --test examples_collection
```

Each `.expected` file was generated from a real run only after the output had
been checked by eye. To add an example: write `NN_name.nep`, run it, check the
output is what the program is supposed to print, then save it as
`NN_name.expected`. The test fails if either half is missing.

## Language cheat sheet / छोटो सारांश

Statements end with `।`, `;`, or just a newline. Comments: `// ...` and
`/* ... */`. Digits may be Devanagari (`०-९`) or ASCII.

| Devanagari | Romanized | Meaning |
|------------|-----------|---------|
| `राखौँ` | `rakha` | declare a variable (`let`) |
| `काम` | `kaam` | define a function |
| `पठाउँ` | `pathau` | return |
| `यदि` | `yadi` | if |
| `भए` | `bhaye` | optional "then" after an `यदि` condition |
| `नत्र` | `natra` | else (`नत्र यदि` = else if) |
| `भएसम्म` | `bhayesamma` | while |
| `भनौँ` / `लेख्नुहोस्` | `bhana` | print |
| `सहि` / `गलत` | `sahi` / `galat` | true / false |
| `केहीछैन` | `kehichaina` | null |
| `आयात` | `aayat` | import another file |
| `र` / `वा` / `होइन` | `ra` / `wa` / `hoina` | and / or / not |

Operators: `+ - * / %`, `== != < <= > >=`, unary `-`, `=` (assign),
`[i]` index, `f(x)` call. Precedence is the usual one; use `(...)` to override.

Builtins:

| Builtin | Purpose |
|---------|---------|
| `लम्बाइ(x)` | length of a string (Unicode chars) or array |
| `अक्षर(शब्द, i)` | character at index `i` |
| `संकेत(अक्षर)` | Unicode code point of a character |
| `थप्नुहोस्(सूची, मान)` | append to an array |
| `ओएस_पढ्नुहोस्(p)` / `ओएस_लेख्नुहोस्(p, पाठ)` / `ओएस_सूची(dir)` | files |
| `आदेश_चलाउनुहोस्(prog, [args])` | run a program: `[code, stdout, stderr]` |
| `डाटाबेस_चलाउनुहोस्(sql)` / `डाटाबेस_सोध्नुहोस्(sql)` | SQLite write / read |
| `पाइथन_चलाउनुहोस्(code)` | Python (result in variable `परिणाम`) |
| `जेएस_चलाउनुहोस्(code)` / `टिएस_चलाउनुहोस्(code)` | JavaScript / TypeScript |

Things that surprise newcomers (all real, all covered by the examples):

- No `for` and no `break`: use `भएसम्म` and a flag variable (05), or `पठाउँ`
  from inside a loop within a function (13).
- Only numbers can be compared with `<`, `>`, `<=`, `>=`; strings support only
  `==` / `!=`.
- Arrays are shared by reference (08); a function that changes its array
  argument changes the caller's array (14).
- `आदेश_चलाउनुहोस्` takes its arguments as an array, and stdout keeps the
  trailing newline (18).
- Negative array indices are an error, not "from the end".
- Imported files share one global scope and their top-level statements run
  first (16).
