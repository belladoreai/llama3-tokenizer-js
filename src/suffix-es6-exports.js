const llama3Tokenizer = new Llama3Tokenizer()
if (typeof window !== 'undefined') {
    window.llama3Tokenizer = llama3Tokenizer
}
export { Llama3Tokenizer }
export default llama3Tokenizer