# Conditions: every form, every rule, every error

Seven programs cover how decisions work in the language, and fifteen small
failing programs show exactly what each mistake looks like. Each has an `.out`
file (exact output); the error programs also have an `.err` file (text that
must appear in the error message). `cargo test --test conditions` in
`crates/nepali-core` checks all of it, including that errors exit with code 1.

Run one: `nepali examples/conditions/C03_truthiness.nep`

## Working programs

| File | Covers |
|---|---|
| [`C01_if_else.nep`](C01_if_else.nep) | `यदि`, `यदि/नत्र`, `नत्र यदि` chains, boundary values, nesting, optional `भए`, empty blocks, early `पठाउँ`, block scope (`राखौँ` shadows, `=` updates the outer variable) |
| [`C02_comparisons.nep`](C02_comparisons.nep) | `== != < > <= >=`, Devanagari vs ASCII digits, values of different types are never equal, list equality, comparison results as values |
| [`C03_truthiness.nep`](C03_truthiness.nep) | what counts as true: false are `0`, `""`, `[]`, `केहीछैन`, `गलत`; everything else is true |
| [`C04_logic.nep`](C04_logic.nep) | `र` `वा` `होइन` truth tables, results are always `सहि`/`गलत`, precedence (`होइन` > `र` > `वा`), leap-year example |
| [`C05_short_circuit.nep`](C05_short_circuit.nep) | the right side of `र`/`वा` is skipped when the left decides; safe guards against empty lists and division by zero |
| [`C06_loop_conditions.nep`](C06_loop_conditions.nep) | `भएसम्म` conditions: never runs, runs once, compound conditions, flag-based early exit (there is no `break`), return from inside a loop |
| [`C07_number_edge_cases.nep`](C07_number_edge_cases.nep) | `1 / 0` is `inf`, `0 / 0` is `NaN` (not equal to itself), `0.1 + 0.2 != 0.3`, negative remainders |

## Error programs (`errors/`)

Two kinds of failure, and the difference matters:

- **Found before running** (`विश्लेषण त्रुटि`, or a parse error): nothing is
  printed, not even lines that come before the mistake (E01 to E06, E11, E12).
- **Found while running** (`चलाउँदा त्रुटि`): everything printed before the
  mistake is kept (E07 to E10, E14, E15). Import errors (E13) stop at load.

| File | Mistake |
|---|---|
| [`E01_undefined_variable`](errors/E01_undefined_variable.nep) | using a name that was never declared |
| [`E02_undefined_function`](errors/E02_undefined_function.nep) | calling a function that does not exist |
| [`E03_assign_undefined`](errors/E03_assign_undefined.nep) | assigning with `=` before `राखौँ` |
| [`E04_type_mismatch_arithmetic`](errors/E04_type_mismatch_arithmetic.nep) | `5 - सहि` |
| [`E05_string_comparison`](errors/E05_string_comparison.nep) | `"क" < "ख"` (text supports only `==` and `!=`) |
| [`E06_wrong_argument_count`](errors/E06_wrong_argument_count.nep) | calling a function with too many arguments |
| [`E07_not_callable`](errors/E07_not_callable.nep) | calling a number like a function |
| [`E08_index_out_of_bounds`](errors/E08_index_out_of_bounds.nep) | reading past the end of an array |
| [`E09_negative_index`](errors/E09_negative_index.nep) | `a[-1]` is an error, not "last item" |
| [`E10_non_number_index`](errors/E10_non_number_index.nep) | `a["एक"]` |
| [`E11_parse_missing_name`](errors/E11_parse_missing_name.nep) | `राखौँ = 5` |
| [`E12_parse_unclosed_brace`](errors/E12_parse_unclosed_brace.nep) | a `{` never closed |
| [`E13_missing_import`](errors/E13_missing_import.nep) | `आयात` of a file that does not exist |
| [`E14_bad_sql`](errors/E14_bad_sql.nep) | SQL the database rejects |
| [`E15_read_missing_file`](errors/E15_read_missing_file.nep) | reading a file that does not exist |

## Behaviours that may surprise you (all real, not errors)

- `1 / 0` and `5 % 0` do not fail: they give `inf` and `NaN` (C07).
- `केहीछैन + 1` does not fail: `+` with any text operand joins text, so it gives
  `केहीछैन1`.
- Values of different types are never equal, so `1 == "1"` is `गलत`.

Array indexes must be whole numbers: `a[1.5]`, `a[0 / 0]` and `a[1 / 0]` are errors
("array index must be a whole number"), not a silent read of the wrong element.

Errors are printed to stderr and the exit code is 1, so scripts and shells can
react to them.
