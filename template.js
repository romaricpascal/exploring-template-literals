// # A template using template literals
// It's a plain JavaScript file, that'll be wrapped
// in its own function. You can create your own functions,
// classes as needed, even `require` other modules.

// We might want to run some arbitrary code ahead
console.log('Wooohooo!!!!');
const moreData = require('./extradata');

// But we need to know which bit is the template,
// so we mark it with a `template` label
// No need to prefix the template literals
template: `<header>${moreData} ${() => {
  if (mood == 'curious') {
    return `<h1>${() => 'Not in the data'}</h1>`;
  }
}}
<ul>${() => {
  // `for` loops won't output anything,
  // so we need to harvest the data
  // as we go
  let s = '';
  for (var i = 0; i < 5; i++) {
    s += `<li>${i}</li>`;
  }
  return s;
}}
</ul>
</header>`;
