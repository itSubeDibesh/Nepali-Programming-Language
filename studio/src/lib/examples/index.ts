import { RecipeItem } from '../types';
import { BASICS_EXAMPLES } from './basics';
import { CONTROL_EXAMPLES } from './control';
import { FUNCTIONS_EXAMPLES } from './functions';
import { ALGORITHMS_EXAMPLES } from './algorithms';
import { DATA_EXAMPLES } from './data';
import { DATES_EXAMPLES } from './dates';
import { SYSTEM_EXAMPLES } from './system';
import { INTEROP_EXAMPLES } from './interop';

export * from './basics';
export * from './control';
export * from './functions';
export * from './algorithms';
export * from './data';
export * from './dates';
export * from './system';
export * from './interop';

export const EXAMPLES: RecipeItem[] = [
  ...BASICS_EXAMPLES,
  ...CONTROL_EXAMPLES,
  ...FUNCTIONS_EXAMPLES,
  ...ALGORITHMS_EXAMPLES,
  ...DATA_EXAMPLES,
  ...DATES_EXAMPLES,
  ...SYSTEM_EXAMPLES,
  ...INTEROP_EXAMPLES,
];

export const EXAMPLE_CATEGORIES = [
  'basics',
  'control',
  'functions',
  'algorithms',
  'data',
  'dates',
  'system',
  'interop',
] as const;

export type ExampleCategory = typeof EXAMPLE_CATEGORIES[number];

export function getExamplesByCategory(category: string): RecipeItem[] {
  if (category === 'all') return EXAMPLES;
  return EXAMPLES.filter((ex) => ex.category === category);
}

export function getExampleById(id: string): RecipeItem | undefined {
  return EXAMPLES.find((ex) => ex.id === id);
}
