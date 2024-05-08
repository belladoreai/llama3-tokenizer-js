import fs from 'node:fs';

// This script bundles the code and data into a single file which can be easily loaded.
fs.readFile('llama3-tokenizer.js', 'utf8', (err, code) => {
    if (err) {
        console.error(err)
        return
    }

    fs.readFile('data-converted.js', 'utf8', (err2, data) => {
        if (err2) {
            console.error(err2)
            return
        }

        const content = [
            code,
            data,
            "const llama3Tokenizer = new Llama3Tokenizer();",
            "if (typeof window !== 'undefined') { window.llama3Tokenizer = llama3Tokenizer; }",
            "export default llama3Tokenizer",
            "try { if (typeof module !== 'undefined' && module.exports) { exports.llama3Tokenizer = llama3Tokenizer } } catch (ex) { }"
        ].join("\n\n")

        fs.writeFile('../bundle/llama3-tokenizer-with-baked-data.js', content, err3 => {
            if (err3) {
              console.error(err3)
              return
            } else {
              console.log('bundle written successfully')
            }
        });
    })
});

