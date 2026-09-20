/* tslint:disable */
/* eslint-disable */

/**
 * Dump the Abstract Syntax Tree (AST) of a Nepali program as an indented tree.
 */
export function ast_dump(code: string): string;

/**
 * Parse a program and return diagnostics (for editor integration).
 */
export function check(code: string): string;

/**
 * Disassemble a Nepali program into human-readable bytecode instructions.
 */
export function disassemble(code: string): string;

/**
 * Run a Nepali program using Tree-walker interpreter and return stdout.
 */
export function run(code: string): string;

/**
 * Run a Nepali program using the Bytecode Stack VM and return stdout.
 */
export function run_vm(code: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly ast_dump: (a: number, b: number) => [number, number, number, number];
    readonly check: (a: number, b: number) => [number, number];
    readonly disassemble: (a: number, b: number) => [number, number, number, number];
    readonly run: (a: number, b: number) => [number, number, number, number];
    readonly run_vm: (a: number, b: number) => [number, number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
