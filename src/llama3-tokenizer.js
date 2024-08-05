/**
 * MIT LICENSE
 * 
 * Copyright 2023 belladore.ai
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 */

/**
 * Helper used to unpack binary data blobs that were baked inside this file with base64
 */
const base64decodeUTF8 = function(encodedString) {
    return atob(encodedString)
}

/**
 * Helper to clean up a Regex pattern from Python/Rust codebase.
 * Copied with minor changes from https://github.com/xenova/transformers.js
 */
const getCleanedRegex = (dirtyRegexString) => {
    // In certain cases, the pattern may contain unnecessary escape sequences (e.g., \# or \& or \~).
    // i.e., valid in Python (where the patterns are exported from) but invalid in JavaScript (where the patterns are parsed).
    // This isn't an issue when creating the regex w/o the 'u' flag, but it is when the 'u' flag is used.
    // For this reason, it is necessary to remove these backslashes before creating the regex.
    // See https://stackoverflow.com/a/63007777/13989043 for more information

    let regex = dirtyRegexString.replace(/\\([#&~])/g, '$1');

    // A mapping of regex patterns to their equivalent (but longer) JS-compatible versions.
    const PROBLEMATIC_REGEX_MAP = new Map([
        // This uses the case insensitive group modifier, which is not supported in JavaScript.
        // When parsing the regex, an "Invalid group" error is thrown.
        ["(?i:'s|'t|'re|'ve|'m|'ll|'d)", "(?:'([sS]|[tT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))"],
    ])

    // Handle special cases where the regex contains invalid (non-JS compatible) syntax.
    for (const [key, value] of PROBLEMATIC_REGEX_MAP) {
        regex = regex.replaceAll(key, value);
    }

    return new RegExp(regex, 'gu')
}

const DIRTY_LLAMA3_REGEX_STRING = "(?i:'s|'t|'re|'ve|'m|'ll|'d)|[^\\r\\n\\p{L}\\p{N}]?\\p{L}+|\\p{N}{1,3}| ?[^\\s\\p{L}\\p{N}]+[\\r\\n]*|\\s*[\\r\\n]+|\\s+(?!\\S)|\\s+"

const CLEAN_LLAMA3_REGEX_STRING = getCleanedRegex(DIRTY_LLAMA3_REGEX_STRING)

/**
 * Helper to split a string on a regex, but keep the delimiters.
 * This is required, because the JavaScript `.split()` method does not keep the delimiters,
 * and wrapping in a capturing group causes issues with existing capturing groups (due to nesting).
 * Copied from https://github.com/xenova/transformers.js
 */
function regexSplit(text, regex) {
    const result = [];
    let prev = 0;
    for (const match of text.matchAll(regex)) {
        const fullMatch = match[0];
        if (prev < match.index) {
            result.push(text.slice(prev, match.index));
        }
        if (fullMatch.length > 0) {
            result.push(fullMatch);
        }
        prev = match.index + fullMatch.length;
    }
    if (prev < text.length) {
        result.push(text.slice(prev));
    }
    return result;
}

/**
 * Returns list of utf-8 byte and a mapping to unicode strings.
 * Specifically avoids mapping to whitespace/control characters the BPE code barfs on.
 * Returns Object with utf-8 byte keys and unicode string values.
 * Copied from https://github.com/xenova/transformers.js
 */
const BYTES_TO_UNICODE = (() => {
    // Returns list of utf-8 byte and a mapping to unicode strings.
    // We specifically avoids mapping to whitespace/control characters
    // the bpe code barfs on.

    const bs = [
        ...Array.from({ length: "~".charCodeAt(0) - "!".charCodeAt(0) + 1 }, (_, i) => i + "!".charCodeAt(0)),
        ...Array.from({ length: "¬".charCodeAt(0) - "¡".charCodeAt(0) + 1 }, (_, i) => i + "¡".charCodeAt(0)),
        ...Array.from({ length: "ÿ".charCodeAt(0) - "®".charCodeAt(0) + 1 }, (_, i) => i + "®".charCodeAt(0)),
    ];
    const cs = bs.slice();
    let n = 0;
    for (let b = 0; b < 256; ++b) {
        if (!bs.includes(b)) {
            bs.push(b);
            cs.push(256 + n);
            n += 1;
        }
    }
    const ccs = cs.map(n => String.fromCharCode(n));
    return Object.fromEntries(bs.map((b, i) => [b, ccs[i]]));
})();

/**
 * From https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
 */
function reverseDictionary(data) {
    // 
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]));
}

const UNICODE_TO_BYTES = reverseDictionary(BYTES_TO_UNICODE);

// When you update special tokens, remember to also update specialTokenRegex
const llama3SpecialTokens = [
    '<|begin_of_text|>',
    '<|end_of_text|>',
    '<|reserved_special_token_0|>',
    '<|reserved_special_token_1|>',
    '<|finetune_right_pad_id|>',
    '<|reserved_special_token_2|>',
    '<|start_header_id|>',
    '<|end_header_id|>',
    '<|eom_id|>',
    '<|eot_id|>',
    '<|python_tag|>'
];
for (let i = 3; i <= 247; i++) {
    llama3SpecialTokens.push(`<|reserved_special_token_${i}|>`);
}

/**
 * PriorityQueue implementation is copied from https://stackoverflow.com/a/42919752 with minor refactoring
 */
class PriorityQueue {
    constructor(comparator = (a, b) => a > b) {
        this._heap = [];
        this._comparator = comparator;
    }
    size() {
        return this._heap.length;
    }
    isEmpty() {
        return this.size() == 0;
    }
    peek() {
        return this._heap[0];
    }
    push(...values) {
        values.forEach(value => {
            this._heap.push(value);
            this._siftUp();
        });
        return this.size();
    }
    pop() {
        const poppedValue = this.peek();
        const bottom = this.size() - 1;
        if (bottom > 0) {
            this._swap(0, bottom);
        }
        this._heap.pop();
        this._siftDown();
        return poppedValue;
    }
    replace(value) {
        const replacedValue = this.peek();
        this._heap[0] = value;
        this._siftDown();
        return replacedValue;
    }
    _parent(i) {
        return ((i + 1) >>> 1) - 1;
    }
    _left(i) {
        return (i << 1) + 1;
    }
    _right(i) {
        return (i + 1) << 1;
    }
    _greater(i, j) {
        return this._comparator(this._heap[i], this._heap[j]);
    }
    _swap(i, j) {
        [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
    }
    _siftUp() {
        let node = this.size() - 1;
        while (node > 0 && this._greater(node, this._parent(node))) {
            this._swap(node, this._parent(node));
            node = this._parent(node);
        }
    }
    _siftDown() {
        let node = 0;
        while (
            (this._left(node) < this.size() && this._greater(this._left(node), node)) ||
            (this._right(node) < this.size() && this._greater(this._right(node), node))
        ) {
            let maxChild = (this._right(node) < this.size() && this._greater(this._right(node), this._left(node))) ? this._right(node) : this._left(node);
            this._swap(node, maxChild);
            node = maxChild;
        }
    }
}

class Llama3Tokenizer {

    vocabById;
    vocabByString;
    merges;

    utf8Encoder = new TextEncoder();
    utf8Decoder = new TextDecoder('utf-8');

    constructor(vocab_base64, merges_binary, special_tokens) {
        // Array where index represents tokenId, value represents tokenString
        this.vocabById = this.decodeVocabulary(vocab_base64 || llama_vocab_base64);
        // Add special tokens to vocabulary
        this.vocabById.push(...(special_tokens || llama3SpecialTokens));

        // Create vocabByString (map where key represents tokenString, value represents tokenId)
        this.vocabByString = new Map();
        this.vocabById.forEach((tokenString, tokenId) => {
            this.vocabByString.set(tokenString, tokenId);
        });
        // Map where key identifies token pair, value represents merge priority
        this.merges = this.decompressMerges(merges_binary || llama_merges_binary);
    }

    getSpecialTokenId(specialTokenString) {
        if (!specialTokenString.startsWith("<|") || !specialTokenString.endsWith("|>")) {
            throw Error('Invalid input. Use this syntax: <|eot_id|>')
        }
        if (!this.vocabByString.has(specialTokenString)) {
            throw Error('Token not found from vocabulary')
        }
        return this.vocabByString.get(specialTokenString)
    }

    getMergeIdentifierString(firstTokenId, secondTokenId) {
        return this.vocabById[firstTokenId] + " " + this.vocabById[secondTokenId]
    }

    decompressMerges(merges_binary) {
        const byteString = base64decodeUTF8(merges_binary)

        // Each 17 bits represents a tokenid (integer between 0 and 128000)
        // Because that isn't cleanly divided into bytes of 8 bits,
        // we need to work with a mental model of operating on a sequence of bits.
        const tokenIds = [];
        const maxBits = byteString.length * 8;
        const firstPaddingBit = maxBits - (maxBits % 17);
        const bitMask = [
            0b11111111111111111,
            0b111111111111111111,
            0b1111111111111111111,
            0b11111111111111111111,
            0b111111111111111111111,
            0b1111111111111111111111,
            0b11111111111111111111111,
            0b111111111111111111111111
        ]
        for (let bitIndex = 0; bitIndex < firstPaddingBit; bitIndex += 17) {
            const byteIndex = bitIndex / 8;

            // The 17 bits we want are contained within these 3 bytes (24 bits)
            const byte1 = byteString.charCodeAt(byteIndex);
            const byte2 = byteString.charCodeAt(byteIndex+1);
            const byte3 = byteString.charCodeAt(byteIndex+2);

            // Start by concatenating the bit representations of the 3 bytes
            let tokenId = (byte1 << 16) + (byte2 << 8) + (byte3);

            // Eliminate the extra bits from the left side of the bit sequence
            tokenId = tokenId & bitMask[8 - (bitIndex % 8) - 1]

            // Eliminate the extra bits from the right side of the bit sequence
            tokenId = tokenId >> (8 - (17 - 8 - (8 - (bitIndex % 8))))

            // Save completed tokenId
            tokenIds.push(tokenId)
        }
    
        // Each pair of tokenIds represents a merge.
        const merges = new Map()
        for (let i=0; i<tokenIds.length; i+=2) {
            const id1 = tokenIds[i]
            const id2 = tokenIds[i+1]
            const mergeIdentifierString = this.getMergeIdentifierString(id1, id2)
            // Key identifies token pair, value represents merge priority
            merges.set(mergeIdentifierString, i+1)
        }
        return merges
    }

    /**
     * Helper function to decode the vocabulary (returns an array that contains Strings representing tokens).
     * 
     * vocab_base64 is base64-encoded string of tokens delimited by '\n' (line break) in utf-8.
     * The row number of the token (indexing from 0) represents the id of the token in LLaMA 3 tokenizer.
     * That row number does not have any particular significance in the tokenizer logic, but we use
     * it to aid with the compression of the merge data, so it has significance to us in that way.
     */
    decodeVocabulary(vocab_base64) {
        const byteArray = Uint8Array.from(base64decodeUTF8(vocab_base64), c => c.charCodeAt(0));
        const textDecoder = new TextDecoder('utf-8');
        return textDecoder.decode(byteArray).split("\n");
    }

    encode(prompt, options) {

        if (typeof options === typeof true) {
            // This check is needed because parameters are different between LLaMA 1 tokenizer and LLaMA 3 tokenizer.
            // If we don't have this check, then some users might inadvertently swap out the tokenizer without noticing
            // that their boolean flags no longer do anything, leading to small discrepancies in their token counts.
            throw Error('Error. You passed boolean parameter instead of options Object!')
        }

        if (!options) {
            // If user has not defined optional parameters, then use these defaults.
            // The defaults have been chosen with intent to OVERESTIMATE token count rather than underestimate it.
            options = {
                bos: true,
                eos: true
            }
        }

        // Allow passing an alternative special token regex. Needed for optimisticCount.
        const specialTokenRegex = options.specialTokenRegex ?? /<\|(?:begin_of_text|end_of_text|start_header_id|end_header_id|eot_id|eom_id|python_tag|finetune_right_pad_id|reserved_special_token_(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-3][0-9]|24[0-7]))\|>/g
    
        if (!this.vocabById || !this.vocabByString || !this.merges) {
            console.log('Tokenizer not initialized properly!')
            return
        }

        // Set up priority queue to efficiently iterate merge possibilities in priority order
        const mergeQueue = new PriorityQueue((a, b) => {
            return a.mergePrio < b.mergePrio
        })

        const addToMergeQueue = (leftNode) => {
            const mergeIdentifierString = this.getMergeIdentifierString(leftNode.tokenId, leftNode.next.tokenId)
            // Merge priority is primarily determined by the location of the merge in the "merges" data,
            // secondarily determined by the relative position of the node in the linked list
            // (We want to perform equal merges from left to right)
            const mergePrio = this.merges.get(mergeIdentifierString) + leftNode.origPos / prompt.length
            if (mergePrio) {
                // If mergePrio not found in merges, that means this merge is not possible according to vocabulary.
                leftNode.mergePrio = mergePrio
                leftNode.mergeToString = mergeIdentifierString.replace(" ", "")
                mergeQueue.push(leftNode)
            }
        }

        // Pretoken level cache
        const cache = new Map()

        // Output array of tokenIds will be filled and returned in this encode function.
        const output = []

        // Special "beginning of string" token.
        if (options.bos) {
            output.push(this.getSpecialTokenId("<|begin_of_text|>"))
        }

        // Split prompt by special tokens, e.g. <|eot_id|>
        const splittedBySpecialTokens = regexSplit(prompt, specialTokenRegex)
        for (let specialSplitIndex=0; specialSplitIndex<splittedBySpecialTokens.length; specialSplitIndex++) {
            const specialSplitString = splittedBySpecialTokens[specialSplitIndex]
            if (specialSplitString.match(specialTokenRegex) && this.vocabByString.has(specialSplitString)) {
                // If this string is a special token according to our regex AND is found from vocabulary, output the corresponding special token id.
                output.push(this.vocabByString.get(specialSplitString))
                continue
            }
            if (specialSplitString.match(specialTokenRegex) && options.unexpectedSpecialTokenFallback) {
                // This is used in optimisticCount to map each unexpected special token into some fallback token.
                output.push(options.unexpectedSpecialTokenFallback)
                continue
            }
            if (specialSplitString.match(specialTokenRegex)) {
                // This string is a special token according to our regex BUT is not found from vocabulary.
                // We don't have options.unexpectedSpecialTokenFallback that we could use.
                // This situation is unexpected and indicates a mismatch between our regex and our vocabulary.
                // The input has been incorrectly split and we cannot guarantee correctness if we continue, so we throw an error.
                throw new Error('Internal error occurred in llama3-tokenizer-js while processing special tokens in input.')
            }
            // If we are here then we treat this string like normal text, not like a special token.

            // SplitPretokenizer
            const splittedByPretokenizer = regexSplit(specialSplitString, CLEAN_LLAMA3_REGEX_STRING)

            // ByteLevelPretokenizer maps all our bytes to unicode strings, this also does the mapping from space to Ġ (charCode 32 -> 32+256)
            const bytemappedSplit = splittedByPretokenizer.map(pretoken => Array.from(this.utf8Encoder.encode(pretoken), byte => BYTES_TO_UNICODE[byte]).join(''))

            // The results from pretokenizer are handled one by one
            for (let pretokenIndex=0; pretokenIndex<bytemappedSplit.length; pretokenIndex++) {
                const pretoken = bytemappedSplit[pretokenIndex]

                // Because LLaMA 3 tokenizer is configured with ignore_merges,
                // we check if the pretoken is found in our vocabulary,
                // and if it is, we map it to tokenId directly from vocabulary
                // (instead of normal BPE processing, like in LLaMA 1 tokenizer,
                // where the BPE process sometimes leads to different tokens).
                if (this.vocabByString.has(pretoken)) {
                    output.push(this.vocabByString.get(pretoken))
                    continue
                }

                // Pretoken was not found from vocabulary, so we proceed with normal BPE processing,
                // which will result in a sequence of at least 2 tokens that represent the pretoken.

                // Cache used for performance
                if (cache.has(pretoken)) {
                    output.push(...(cache.get(pretoken)))
                    continue
                }

                // Initially each character is transformed to a tokenId, later there will be merges of these.
                // Note that this array represents the tokenIds of the pretoken, not the entire sequence (there are typically multiple pretokens).
                const tokenIds = []

                // Transform each character to its corresponding token
                const charArray = Array.from(pretoken)
                for (let i=0; i<charArray.length; i++) {
                    const c = charArray[i]
                    if (!this.vocabByString.has(c)) {
                        throw Error(`Character ${c} not found from vocabulary. This is not supposed to happen (vocab is supposed to cover everything that comes out of pretokenization).`)
                    }
                    tokenIds.push(this.vocabByString.get(c))
                }

                // Fill merge queue from initial merge possibilities and construct linked list
                let firstTokenNode = {
                    origPos: 0,
                    tokenId: tokenIds[0],
                    prev: null,
                    next: null,
                }
                let prevTokenNode = firstTokenNode
                for (let i=1; i<tokenIds.length; i++) {
                    const currTokenNode = {
                        origPos: i,
                        tokenId: tokenIds[i],
                        prev: prevTokenNode,
                        next: null
                    }
                    prevTokenNode.next = currTokenNode
                    addToMergeQueue(prevTokenNode)
                    prevTokenNode = currTokenNode
                }
            
                // Perform merges in priority order
                while (!mergeQueue.isEmpty()) {
                    const leftOfMerge = mergeQueue.pop()
                    // Check that this merge is still possible
                    if (leftOfMerge.deleted) continue
                    if (!leftOfMerge.next) continue
                    if (leftOfMerge.next.deleted) continue
                    
                    // Mark leftOfMerge and rightOfMerge as being deleted, because they are actually being replaced by a merged token.
                    leftOfMerge.deleted = true
                    leftOfMerge.next.deleted = true
                    // It's a little bit more complicated to fix the prev of leftOfMerge.
                    if (leftOfMerge.prev) {
                        const oldPrev = leftOfMerge.prev
                        // Mark oldPrev as deleted, to avoid erroneous merges later (ref to this node might exist in priorityqueue)
                        oldPrev.deleted = true
                        // Replace oldPrev within the linked list with a copy of itself
                        const newPrev = {
                            origPos: oldPrev.origPos,
                            tokenId: oldPrev.tokenId,
                            prev: oldPrev.prev,
                            next: oldPrev.next
                        }
                        leftOfMerge.prev = newPrev
                        // Update linked list reference of "prev of prev"
                        if (newPrev.prev) {
                            newPrev.prev.next = newPrev
                        } else {
                            // If "prev of prev" does not exist, that means newPrev must be the new firstNode
                            firstTokenNode = newPrev
                        }
                    }
                    // Create node representing merge result
                    const resultOfMerge = {
                        origPos: leftOfMerge.origPos,
                        tokenId: this.vocabByString.get(leftOfMerge.mergeToString),
                        prev: leftOfMerge.prev,
                        next: leftOfMerge.next.next
                    }
                    // Consider adding to merge queue: prev--resultOfMerge
                    if (resultOfMerge.prev) {
                        resultOfMerge.prev.next = resultOfMerge
                        resultOfMerge.prev
                        addToMergeQueue(resultOfMerge.prev)
                    } else {
                        // If prev does not exist then this is the new firstNode
                        firstTokenNode = resultOfMerge
                    }
                    // Consider adding to merge queue: resultOfMerge--next
                    if (resultOfMerge.next) {
                        resultOfMerge.next.prev = resultOfMerge
                        addToMergeQueue(resultOfMerge)
                    }
            
                }
            
                // Get final tokenIds for this pretoken by traversing the linked list
                const mergedTokenIds = []
                for (let currTokenNode = firstTokenNode; currTokenNode !== null; currTokenNode = currTokenNode.next) {
                    mergedTokenIds.push(currTokenNode.tokenId)
                }

                // Add to cache
                cache.set(pretoken, mergedTokenIds)
            
                // Add to output the tokenIds that correspond to this pretoken
                output.push(...mergedTokenIds)
            }
        }

        // Special "end of string" token.
        if (options.eos) {
            output.push(this.getSpecialTokenId("<|end_of_text|>"))
        }

        return output
    }

    decode(tokenIds) {
        const utf8byteVals = []
        for (let i=0; i<tokenIds.length; i++) {
            const tokenId = tokenIds[i]
            const tokenString = this.vocabById[tokenId]
            const utf8bytes = [...tokenString].map(c => UNICODE_TO_BYTES[c])
            utf8bytes.forEach(utf8Byte => utf8byteVals.push(utf8Byte))
        }
        const byteArray = new Uint8Array(utf8byteVals);
        return this.utf8Decoder.decode(byteArray);
    }

    // This is named "optimistic" in the sense that it optimistically assumes that
    // anything that looks like a special token is actually a special token (as opposed to normal text).
    // Intent is to use this when working with various fine tunes which have modified special tokens.
    optimisticCount(prompt) {
        const options = {
            bos: true,
            eos: true,
            specialTokenRegex: /<\|[a-zA-Z0-9_]+\|>/g,
            unexpectedSpecialTokenFallback: 1, // Don't care which token we map to, we only care about count
        }
        return this.encode(prompt, options).length
    }

    defaultTests(tokenizer) {

        let testNum = 0

        function isEqual(arr1, arr2) {
            return arr1.length === arr2.length && arr1.every(function(value, index) { return value === arr2[index]})
        }

        function testEncode(inputString, expectedTokenIds, encoderOptions) {
            let startTime = performance.now()
            const actualTokens = tokenizer.encode(inputString, encoderOptions)
            if (!isEqual(actualTokens, expectedTokenIds)) {
                throw Error(`Encoder test failed: expected tokenize(${inputString}) === ${expectedTokenIds}, actual was: ${actualTokens}`)
            }
            console.log(`#${testNum++} test successful (encode test, running time ${Math.round(10 * (performance.now() - startTime)) / 10} ms)`)
            return actualTokens
        }

        function testDecode(tokenIds, expectedString) {
            let startTime = performance.now()
            const actualString = tokenizer.decode(tokenIds)
            if (actualString !== expectedString) {
                throw Error(`Decoder test failed: expected decode(${tokenIds}) === ${expectedString}, actual was: ${actualString}`)
            }
            console.log(`#${testNum++} test successful (decode test, running time ${Math.round(10 * (performance.now() - startTime)) / 10} ms)`)
        }
    
        function testEncodeAndDecode(inputString, expectedTokenIds) {
            const encoderOptions = {
                bos: false,
                eos: false
            }
            const actualTokens = testEncode(inputString, expectedTokenIds, encoderOptions)
            testDecode(actualTokens, inputString)
        }

        function testOptimisticCount(inputString, expectedCount) {
            let startTime = performance.now()
            const actualCount = tokenizer.optimisticCount(inputString)
            if (actualCount !== expectedCount) {
                throw Error(`Optimistic count test failed: expected ${expectedCount}, actual was: ${actualCount}`)
            }
            console.log(`#${testNum++} test successful (optimisticCount test, running time ${Math.round(10 * (performance.now() - startTime)) / 10} ms)`)
        }
            
        // Simple test case
        testEncodeAndDecode("grabbed",                           [59312, 2788])
    
        // Naive implementation produces inconsistent tokenization for " grabbed" (in LLAMA 1 TOKENIZER), making this a good test case (for LLAMA 1 TOKENIZER but probably not for LLAMA 3 TOKENIZER)
        testEncodeAndDecode(" grabbed",                          [30418])
    
        // Naive implementation (in LLAMA 1 TOKENIZER) uses incorrect merge order for multiple consecutive space merges, making this a good test case (for LLAMA 1 TOKENIZER but probably not for LLAMA 3 TOKENIZER)
        testEncodeAndDecode("           grabbed",                [1881, 30418])
    
        // Linebreak and tab are handling
        testEncodeAndDecode("\n",                                [198])
        testEncodeAndDecode(" \n",                               [720])
        testEncodeAndDecode("	tabs				out here",   [3324, 3518, 573, 14294, 1618])
    
        // Equal prio merges are performed left-to-right (bug fixed in 1.1.1 of LLAMA 1 TOKENIZER, TODO: this test input should be updated so that this failure type would be tested properly in LLAMA 3 TOKENIZER)
        testEncodeAndDecode("ax\n####\nboo",                     [710, 198, 71050, 34093])
    
        // UTF-8 multipoint character that should be found in vocabulary
        testEncodeAndDecode('镇',                                [104643])
    
        // UTF-8 multipoint character that should NOT be found in vocabulary
        testEncodeAndDecode('🦙',                               [9468, 99, 247])
    
        // Consecutive UTF-8 multipoint characters that are NOT found in a vocabulary and use different number of bytes
        testEncodeAndDecode('🦙Ꙋ',                             [9468, 99, 247, 166, 247, 232])
        testEncodeAndDecode('Ꙋ🦙',                             [166, 247, 232, 9468, 99, 247])

        // Test input from official LLaMA 3 library
        testEncodeAndDecode('This is a test sentence.',         [2028, 374, 264, 1296, 11914, 13])
    
        // Larger text input with various special characters sprinkled in
        testEncodeAndDecode("The llama (/ˈlɑːmə/; 🦙Spanish pronunciation: [ˈʎama]) (Lama glama) is a domesticated South American camelid, widely used as a meat and pack animal by Andean cultures since the Pre-Columbian era. Llamas are social animals and live with others as a herd. Their wool is soft and contains only a small amount of lanolin.[2] Llamas can learn simple tasks after a few repetitions. When using a pack, they can carry about 25 to 30% of their body weight for 8 to 13 km (5–8 miles).[3] The name llama (in the past also spelled \"lama\" or \"glama\") was adopted by European settlers from native Peruvians.[4] The ancestors of llamas are thought to have originated from the Great Plains of North America about 40 million years ago, and subsequently migrated to South America about three million years ago during the Great American Interchange. By the end of the last ice age (10,000–12,000 years ago), camelids were extinct in North America.[3] As of 2007, there were over seven million llamas and alpacas in South America and over 158,000 llamas and 100,000Ꙋ🦙 alpacas, descended from progenitors imported late in the 20th century, in the United States and Canada.[5] In Aymara mythology, llamas are important beings. The Heavenly Llama is said to drink water from the ocean and urinates as it rains.[6] According to Aymara eschatology, llamas will return to the water springs and lagoons where they come from at the end of time.[6]",
        [791, 94776, 47325, 135, 230, 75, 133, 239, 135, 238, 76, 99638, 14, 26, 11410, 99, 247, 62897, 71722, 25, 510, 135, 230, 134, 236, 3105, 2526, 320, 43, 3105, 2840, 3105, 8, 374, 264, 13018, 660, 4987, 3778, 50252, 307, 11, 13882, 1511, 439, 264, 13339, 323, 3854, 10065, 555, 1628, 5420, 27833, 2533, 279, 5075, 7813, 1152, 13464, 11639, 13, 445, 24705, 300, 527, 3674, 10099, 323, 3974, 449, 3885, 439, 264, 59213, 13, 11205, 39640, 374, 8579, 323, 5727, 1193, 264, 2678, 3392, 315, 31791, 37737, 8032, 17, 60, 445, 24705, 300, 649, 4048, 4382, 9256, 1306, 264, 2478, 86066, 13, 3277, 1701, 264, 3854, 11, 814, 649, 6920, 922, 220, 914, 311, 220, 966, 4, 315, 872, 2547, 4785, 369, 220, 23, 311, 220, 1032, 13437, 320, 20, 4235, 23, 8931, 94638, 18, 60, 578, 836, 94776, 320, 258, 279, 3347, 1101, 68918, 330, 81101, 1, 477, 330, 6200, 3105, 909, 574, 18306, 555, 7665, 61107, 505, 10068, 3700, 12328, 5493, 8032, 19, 60, 578, 38618, 315, 9507, 29189, 527, 3463, 311, 617, 44853, 505, 279, 8681, 63911, 315, 4892, 5270, 922, 220, 1272, 3610, 1667, 4227, 11, 323, 28520, 73691, 311, 4987, 5270, 922, 2380, 3610, 1667, 4227, 2391, 279, 8681, 3778, 5783, 3455, 13, 3296, 279, 842, 315, 279, 1566, 10054, 4325, 320, 605, 11, 931, 4235, 717, 11, 931, 1667, 4227, 705, 50252, 3447, 1051, 69918, 304, 4892, 5270, 8032, 18, 60, 1666, 315, 220, 1049, 22, 11, 1070, 1051, 927, 8254, 3610, 9507, 29189, 323, 453, 46051, 300, 304, 4987, 5270, 323, 927, 220, 11286, 11, 931, 9507, 29189, 323, 220, 1041, 11, 931, 166, 247, 232, 9468, 99, 247, 453, 46051, 300, 11, 58842, 505, 84360, 12170, 25973, 3389, 304, 279, 220, 508, 339, 9478, 11, 304, 279, 3723, 4273, 323, 7008, 8032, 20, 60, 763, 362, 1631, 5169, 59492, 11, 9507, 29189, 527, 3062, 23837, 13, 578, 88150, 445, 81101, 374, 1071, 311, 7172, 3090, 505, 279, 18435, 323, 4433, 258, 988, 439, 433, 62555, 8032, 21, 60, 10771, 311, 362, 1631, 5169, 1560, 9884, 2508, 11, 9507, 29189, 690, 471, 311, 279, 3090, 42242, 323, 326, 6438, 2439, 1405, 814, 2586, 505, 520, 279, 842, 315, 892, 8032, 21, 60])

        // Encoder options test
        testEncode("I", [128000, 40, 128001], { bos: true, eos: true })
        testEncode("I", [128000, 40],         { bos: true, eos: false })
        testEncode("I", [40, 128001],         { bos: false, eos: true })
        testEncode("I", [40],                 { bos: false, eos: false })

        // Empty input with encoder options
        testEncode("", [128000, 128001],      { bos: true, eos: true })

        // Default encoder options: bos true and eos true
        testEncode("I", [128000, 40, 128001])

        // Special tokens
        testDecode([128000], '<|begin_of_text|>')
        testDecode([128006], '<|start_header_id|>')
        testDecode([128004], '<|finetune_right_pad_id|>')
        testDecode([128008], '<|eom_id|>')
        testDecode([128010], '<|python_tag|>')
        testDecode([128000, 2028, 374, 264, 1296, 11914, 13, 128001], "<|begin_of_text|>This is a test sentence.<|end_of_text|>") // Test from official LLaMA 3 library
        testEncodeAndDecode('<|start_header_id|>This text has special tokens<|eom_id|> in the middle of it.<|end_header_id|><|eot_id|>', [128006, 2028, 1495, 706, 3361, 11460, 128008, 304, 279, 6278, 315, 433, 13, 128007, 128009])

        // Test for regex errors in the regex that is used to split input by special tokens, it has complicated regex to validate that reserved special tokens only go from 0 to 250
        const stringsThatLookLikeSpecialTokens = [
            // These are real special tokens in both Llama 3 and Llama 3.1
            '<|reserved_special_token_0|>',
            '<|reserved_special_token_9|>',
            '<|reserved_special_token_10|>',
            '<|reserved_special_token_19|>',
            '<|reserved_special_token_53|>',
            '<|reserved_special_token_99|>',
            '<|reserved_special_token_100|>',
            '<|reserved_special_token_178|>',
            '<|reserved_special_token_199|>',
            '<|reserved_special_token_200|>',
            '<|reserved_special_token_246|>',
            '<|reserved_special_token_247|>',
            // These are not real special tokens and should be processed as normal text (unless calling optimisticCount)
            '<|reserved_special_token_00|>',
            '<|reserved_special_token_09|>',
            '<|reserved_special_token_010|>',
            '<|reserved_special_token_251|>',
            '<|reserved_special_token_666|>',
            // These are treated as "not real special tokens" as they are not special tokens in Llama 3.1 (even though they technically are special tokens in Llama 3) (shouldn't matter, they should not be in use anyway, for simplicity do it like this)
            '<|reserved_special_token_248|>',
            '<|reserved_special_token_249|>',
            '<|reserved_special_token_250|>',
        ]
        testEncodeAndDecode(stringsThatLookLikeSpecialTokens.join(""),
        [128002,128017,128018,128027,128061,128107,128108,128186,128207,128208,128254,128255,27,91,52202,42729,6594,62,410,91,1822,91,52202,42729,6594,62,2545,91,1822,91,52202,42729,6594,62,7755,91,1822,91,52202,42729,6594,62,13860,91,1822,91,52202,42729,6594,62,10943,91,1822,91,52202,42729,6594,62,14185,91,1822,91,52202,42729,6594,62,14735,91,1822,91,52202,42729,6594,62,5154,91,29])
        
        testOptimisticCount([
            // 2 tokens for bos and eos
            // 20 tokens from the following
            ...stringsThatLookLikeSpecialTokens,
            // 2 tokens from the following (optimisticCount assumes strings that look like this are real tokens)
            '<|new_tok|>',
            '<|t|>',
            // 13 tokens from the following (these should NOT be parsed as real tokens, but as normal text)
            '<||>',
            '<|hello world|>',
            '<|what!|>'
        ].join(""), 37)
    
        console.log('LLaMA 3 Tokenizer tests passed successfully.')
        return true
    }

    runTests(tests=this.defaultTests) {
        tests(this);
    }

}