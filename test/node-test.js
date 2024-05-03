import llama3Tokenizer from '../src/llama3-tokenizer.js'

console.log(llama3Tokenizer.decode(llama3Tokenizer.encode("Hello world!")), llama3Tokenizer.encode("Hello world!"))
llama3Tokenizer.runTests()