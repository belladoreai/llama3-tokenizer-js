type EncodeOptions = {
    bos?: boolean,
    eos?: boolean
}

export declare class Llama3Tokenizer {
    vocabById: string[];
    vocabByString: Map<string, number>;
    merges: Map<string, number>;
    constructor(vocab_base64?: string, merges_binary?: string);
    encode(prompt: string, options?: EncodeOptions): number[];
    decode(tokenIds: number[]): string;
    getSpecialTokenId(tokenString: string): number;
    runTests(tests?: (tokenizer: Llama3Tokenizer) => boolean): void
}
declare const llama3Tokenizer: Llama3Tokenizer;
export default llama3Tokenizer;
//# sourceMappingURL=types.d.ts.map