// # Tinkering with template literals
// An experiment to explore how much native template literals
// get you as templates, and how to add the missing niceties

// ## Template literal?
// Let's say we have some data
const data = {
  name: 'Romaric',
  mood: 'curious'
};

// And now we want to output that data in a string
// that says: {name} is {mood}
// The string is simple enough that we could concatenate
console.log('concat', data.name + ' is ' + data.mood);

// ES6 introduced template literals, which are a bit nicer
// Especially if the string was to become more complex, with more data inserted
console.log('template lit.', `${data.name} is ${data.mood}`);

// ## A first template function
// So far so good. Now let's say we want to handle different data objects
// We can wrap that in a function. A little destructuring in the arguments
// even makes the template nicer to read
function simpleTemplateLit(obj) {
  with (obj) {
    return `${name} is ${mood}`;
  }
}

console.log('template lit. fun', simpleTemplateLit(data));

// ## Tagged template literals
// Neat! Now it's all nice, but all we can do is insert the data within the string.
// Which means each bit of the data has to be prepared to be inserted in the string.
// Would be great if we could process that data a bit, regardless of the shape of the template
// before it gets within the string
//
// Template litterals come with a nice addition: tagged template litterals
// You can prepend the template literal with the name of a function, like so.
//
// ```
// basicTaggedTemplate`${name} is ${mood}`
// ```
//
// That function will receive a breakdown of the template:
//
// - an Array of all the string parts as first arguments
// - all the variable parts of the templates as subserquent arguments (thankfully there's destructuring to grab them all)
//
// Let's just reassemble the pieces for that first implementation
function basicTag(parts, ...values) {
  let result = parts[0];
  for (var i = 1; i < parts.length; i++) {
    result += values[i - 1];
    result += parts[i];
  }
  return result;
}

function basicTagTemplate(data) {
  with (data) {
    return basicTag`${data.name} is ${data.mood}`;
  }
}

console.log('basic tagged template', basicTagTemplate(data));

// ## Processing values with tagged template literals
// Now its all nice, but we were talking about procressing values
// so let's use
const dataWithFunctions = {
  name() {
    return 'Romaric';
  },
  mood() {
    return 'excited';
  }
};

console.log('basic tagged template', basicTagTemplate(dataWithFunctions));

// Let's create a little function to process our data
function processValue(value) {
  if (typeof value === 'function') {
    return value() || '';
  } else if (Array.isArray(value)) {
    return Array.join('') || '';
  } else if (typeof value === 'object') {
    return JSON.stringify(value) || '';
  } else {
    return value || '';
  }
}

// Now we can create tags that will process their values
function processTag(processor) {
  return function(parts, ...values) {
    let result = parts[0];
    for (var i = 1; i < parts.length; i++) {
      result += processor(values[i - 1]);
      result += parts[i];
    }
    return result;
  };
}

// Assemble both to create the actual processor
const processor = processTag(processValue);

function processTagTemplate(data) {
  with (data) {
    return processor`${data.name} is ${data.mood}`;
  }
}

// And we're back on our feet
console.log('process tag template', processTagTemplate(data));

// Processor is a bit of a long name, let's go with something shorter
// like t for template

const t = processTag(processValue);

// There we go, we can have functions withing template literals
// this allows us to use `if` statements, which we could not do
// before, for example
const string = t`<h1>${() => {
  if (data.mood == 'happy') {
    return `yeah!`;
  } else {
    return `oh no :'(`;
  }
}}</h1>`;

console.log(string);

// We can even have the function returning its own tagged template
// literal
data.mood = 'happy';
const string2 = t`<header>${() => {
  if (data.mood == 'curious') {
    return t`<h1>${() => 'Not in the data'}</h1>`;
  }
}}</header>`;
console.log(string2);

// Now like before, let's wrap in in a template function
// so we can pass any kind of data
function template(data) {
  with (data) {
    return t`<header>${() => {
      if (mood == 'curious') {
        return t`<h1>${() => name}</h1>`;
      }
    }}</header>`;
  }
}

console.log(template({ name: 'Romaric', mood: 'curious' }));

// ## Generating the boilerplate parts
// It's a bit tedious to wrap each template in its own function that exposes,
// the arguments. It's also cumbersome to tag each template literal ourselves.
// So let's try and get a computer to do the job for us.
// We'll extract the code of the template in [a separate file](template), read it from the disc
// and use Babel transforms to reshape the code to our needs.
// >Props to the [babel-handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md)
// > and [Babel documentation](https://babeljs.io/docs/en/babel-core) which made this super painless

// These are the transforms we're going to need
// First we'll need to tag each template literal with the tag of our chosing
// It will turn ```template``` into `tagname``template```
function transformTTL(tagName) {
  // Creates the actual transform with our chosen tagname
  return function({ types: t }) {
    return {
      visitor: {
        TemplateLiteral(path) {
          // Avoid tagging template literals that are already tagged
          if (path.parent.type !== 'TaggedTemplateExpression') {
            path.replaceWith(
              t.taggedTemplateExpression(t.identifier(tagName), path.node)
            );
          }
        }
      }
    };
  };
}

// This second transform allows to mark the actual template part
// to be prefixed by a `return` so the generated function
// actually returns somethins.
// TODO:
//
// - Automatically return last statement
// - Allow the template to not be the last statement and append a return
function transformLabelToReturn(labelName = 'template') {
  return function({ types: t }) {
    return {
      visitor: {
        LabeledStatement(path) {
          console.log(path.node.label.name);
          if (path.node.label.name === labelName) {
            path.replaceWith(t.returnStatement(path.node.body.expression));
          }
        }
      }
    };
  };
}

// So let's create our function that'll accept the path to a file
// And return a function that accepts some data
function fromFile(templatePath) {
  // We'll need to read the file
  const fs = require('fs');
  const content = fs.readFileSync(templatePath, 'utf-8');

  // Now we can run the babel transforms to automatically tag
  // our template literals with our chosen function
  const { transformSync } = require('@babel/core');
  const TAG_NAME = 't';
  const result = transformSync(content, {
    plugins: [
      // The transform tagging all the template literals
      transformTTL(TAG_NAME),
      // A second transform to allow running an arbitrary bit
      // of JavaScript before the template literal and mark it
      // to be returned
      transformLabelToReturn('template')
    ]
  });

  // Now we can create the body of our function, that will take
  // a `context` Object parameter, expose all its keys as variables
  // thanks to `with` and then run it.
  // TODO: Maybe use a babel transform for that bit too,
  //       there might be some subtleties around sourcemaps there
  const ARGUMENT_NAME = 'context';
  const body = `with(${ARGUMENT_NAME}) {
    ${result.code}
  }`;

  // Finally we can create the function that will do the rendering
  return new Function(ARGUMENT_NAME, body);
}
data.mood = 'curious';

// And call it :D
const { resolve } = require('path');
const FILE_PATH = resolve(__dirname, 'template.js');
console.log(fromFile(FILE_PATH)({ ...data, t, require }));

// TODO:
// - prevent ${a=5} to output 5
// - automatically generate loops to transform:
//   ```
//   for(var i = 0; i < 5; i++) {
//     `<li>${i}</li>`
//   }
//   ```
//   to
//   ```
//   let _result = '';
//   for(var i = 0; i < 5; i++) {
//     _result += `<li>${i}</li>`
//   }
//   return _result;
//   ```
//   Expand same for while loops
//   Allow customization of which bit gets appended to the result with a label
// - JSX to template literal converter to get nicer templates
// - Automatically return the last statement of the template (if there's no return yet)
// - Automatically return template literals inside if statements?
