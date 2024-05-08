const llama3Tokenizer = new Llama3Tokenizer()
if (typeof window !== 'undefined') {
    window.llama3Tokenizer = llama3Tokenizer
}

if (typeof module !== 'undefined' && module.exports) {
    exports.llama3Tokenizer = llama3Tokenizer
}