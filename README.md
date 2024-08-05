# 🦙 llama3-tokenizer-js 🦙

JavaScript tokenizer for LLaMA 3 and LLaMA 3.1.

Intended use case is calculating token count accurately on the client-side.

Works client-side in the browser, in Node, in TypeScript codebases, in ES6 projects, and in CommonJS projects.

<a href="https://belladoreai.github.io/llama3-tokenizer-js/example-demo/build/">Click here for demo</a>

## Features

- Easy to use: 0 dependencies, code and data baked into a [single file](bundle/llama3-tokenizer-with-baked-data.js).
- Compatible with most LLaMA 3 models (see [Compatibility](#compatibility))
- Optimized running time (highly efficient BPE implementation)
- Somewhat optimized bundle size, though it's still ugly (data is written in a custom format where it takes up 3MB before minification and gzipping, which is ugly, yes, but still better than the original 9MB raw json data file)

## Quick start

Install as an npm package and import as ES6 module

```
npm install llama3-tokenizer-js
```

```
import llama3Tokenizer from 'llama3-tokenizer-js'

console.log(llama3Tokenizer.encode("Hello world!").length) // returns token count 5
```

## Alternative ways to import

It's possible to load the [main bundle file](bundle/llama3-tokenizer-with-baked-data.js) with simple `<script>` tags:

```
<script type="module" src="https://belladoreai.github.io/llama3-tokenizer-js/bundle/llama3-tokenizer-with-baked-data.js"></script>
```

If you decide to load with script tags, be sure to either grab a copy of the file into your local build, or change the github URL such that you lock the file to a specific commit.

Alternative import syntax for CommonJS projects:

```
async function main() {
    const llama3Tokenizer = await import('llama3-tokenizer-js')
    console.log(llama3Tokenizer.default.encode("Hello world!").length)
}

main();
```

If you need to use CommonJS with the normal import syntax, you can try loading this experimental CommonJS version of the library: [bundle/commonjs-llama3-tokenizer-with-baked-data.js](https://belladoreai.github.io/llama3-tokenizer-js/bundle/commonjs-llama3-tokenizer-with-baked-data.js).

## Usage

Once you have the module imported, you can encode or decode with it. Training is not supported.

When used in browser, llama3-tokenizer-js pollutes global namespace with `llama3Tokenizer`.

Encode:

```
llama3Tokenizer.encode("Hello world!")
> [128000, 9906, 1917, 0, 128001]
```

Decode:

```
llama3Tokenizer.decode([128000, 9906, 1917, 0, 128001])
> '<|begin_of_text|>Hello world!<|end_of_text|>'
```

Note the special tokens in the beginning and end. These affect token count. You can pass an options object if you don't want to add these:

```
llama3Tokenizer.encode("Hello world!", { bos: false, eos: false })
> [9906, 1917, 0]
```

Note that, contrary to LLaMA 1 tokenizer, the LLaMA 3 tokenizer does not add a preceding space (please open an issue if there are circumstances in which a preceding space is still added).

## Compatibility

### Model families

This tokenizer is mostly* compatible with all models which have been trained on top of checkpoints released by Facebook in April 2024 ("LLaMA 3").

What this means in practice:
- ✅ LLaMA 3 models released by Facebook: yes, they are compatible
- ✅ New LLaMA 3 based fine tune by somebody other than Facebook: yes, it's compatible (except possibly for some special tokens*)
- ❌ New LLaMA 3 model trained from scratch by somebody other than Facebook: probably not compatible, depends if they also retrained the tokenizer (and/or if they added their own special tokens*)
- ❌ LLaMA 1 or LLaMA 2 based models: no, not compatible (use [llama-tokenizer-js](https://github.com/belladoreai/llama-tokenizer-js) instead)
- ❌ OpenAI models: no, not compatible
- ❌ Mistral models: no, not compatible

_*See below section "Special tokens and fine tunes"._

If you are unsure about compatibility, try it and see if the token ids are the same (compared to running the model with, for example, the transformers library). If you are testing a fine tune, remember to test with the relevant special tokens.

### Adapting this library for incompatible models

If you want to make this library work with different tokenizer data, you may be interested in [this script](src/data-conversion.py) which was used to convert the data.

You can pass custom vocab and merge data to the tokenizer by instantiating it like this:

```
import { Llama3Tokenizer } from 'llama3-tokenizer-js'
const tokenizer = new Llama3Tokenizer(custom_vocab, custom_merge_data);
```

Please note that if you try to adapt this library to work for a different tokenizer, there are many footguns and it's easy to set up something that almost works. If the only thing that needs to change is vocab and merge data, and they are of same size as the previous vocab and merge data, you should be fine. But if anything else in addition to vocab and merge data needs to change, you have to read and understand the full source code and make changes where needed.

### Special eos token

It's common with language models, including Llama 3, to denote the end of sequence (eos) with a special token. Please note that in May 2024 the eos token in the official Huggingface repo for Llama 3 instruct was changed by Huggingface staff from `<|end_of_text|>` to `<|eot_id|>`. Both of these special tokens already existed in the tokenizer, the change merely affects how these tokens are treated in commonly used software such as oobabooga. This change makes sense in the context of Llama 3 instruct, but it does not make sense in the context of Llama 3 base model. Therefore, I have decided I will not change the eos token in this library. In any case, this discrepancy will not affect token counts. It's something you need to be aware of only if you use the generated tokens for purposes other than counting.

### Special tokens and fine tunes

There is a large number of special tokens in Llama 3 (e.g. `<|end_of_text|>`). You can pass these inside text input, they will be parsed and counted correctly (try the example-demo playground if you are unsure).

However, sometimes when people fine tune models, they change the special tokens by adding their own tokens and even shifting the ids of pre-existing special tokens. For example: [Hermes-2-Pro-Llama-3-8B](https://huggingface.co/NousResearch/Hermes-2-Pro-Llama-3-8B/blob/main/tokenizer_config.json). This is unfortunate for our token counting purposes. If you are using this library to count tokens, and you are using a fine tune which messes around with special tokens, you can choose one of the following approaches:

1) Instead of calling `.encode(str).length`, you can call `.optimisticCount(str)`. Optimistic count is a convenience function which parses the text with the assumption that anything that looks like a special token (e.g. `<|boom|>`) is actually a special token.
2) If you need exact token counts, you can work around this issue by using this library to tokenize _only_ user input text (which shouldn't contain any special tokens) and then programmatically adding the relevant counts for the special tokens that you are using to wrap the input text.
3) Alternatively, you can choose to ignore this issue, in which case you will be overcounting tokens by a little bit, which is not too bad (in typical use cases, undercounting can lead to more severe quality issues than overcounting).

## Tests

1. Node test: `node test/node-test.js`
2. Browser test: run `live-server` and open test/browser-test.html
4. Example-demo test: run `cd example-demo && npm install && npm run build && live-server` and open the "build" folder

Note that some parts of the code might behave differently in node compared to browser environment.

## Repo maintenance

Release steps:

0. bundle code and data into a single file: `cd src && node create-bundle.js`
1. run node test
2. run browser test
3. bump version number in root package.json
4. push changes to github
5. npm publish --dry-run
6. npm publish
7. bump version number in example-demo/package.json
10. run example-demo test
11. README update?
12. push again to github
13. create new release on github

## Who did this

LLaMA3-tokenizer-js is a fork of my earlier LLaMA 1 tokenizer [llama-tokenizer-js](https://github.com/belladoreai/llama-tokenizer-js).

Several helper functions used in LLaMA 3 pretokenization were adapted from the fantastic [transformers.js](https://github.com/xenova/transformers.js) library. The BPE implementation, which is the core of this library, is original work and [was adapted into transformers.js](https://github.com/belladoreai/llama-tokenizer-js/issues/9). In other words, some work has been adapted from llama-tokenizer-js into transformers.js, and some work has been adapted the other way, from transformers.js into llama3-tokenizer-js.

The example-demo (tokenizer playground) is a fork of [gpt-tokenizer playground](https://github.com/niieani/gpt-tokenizer).

Developed by [belladore.ai](https://belladore.ai) with contributions from [xenova](https://github.com/xenova), [blaze2004](https://github.com/blaze2004), [imoneoi](https://github.com/imoneoi) and [ConProgramming](https://github.com/ConProgramming).