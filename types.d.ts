export declare class Llama3Tokenizer {
    vocabById: string[];
    vocabByString: Map<string, number>;
    merges: Map<string, number>;
    constructor(vocab_base64?: string, merges_binary?: string);
    encode(prompt: string, add_bos_token?: boolean, add_preceding_space?: boolean, log_performance?: boolean): number[];
    decode(tokenIds: number[], add_bos_token?: boolean, add_preceding_space?: boolean): string;
    getSpecialTokenId(tokenString: string): number;
    runTests(tests?: (tokenizer: LlamaTokenizer) => boolean): void
}
declare const llama3Tokenizer: Llama3Tokenizer;
export default llama3Tokenizer;
//# sourceMappingURL=types.d.ts.map