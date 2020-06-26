import { bar } from './lib_bar';

export function foo() {
  console.log('Calling foo_modified().');
  bar();
}

