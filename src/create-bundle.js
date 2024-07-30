import fs from 'node:fs';

// This script bundles the code and data into a single file which can be easily loaded (ES6)
// and also into another file for CommonJS.
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

        // Create ES6 bundle
        fs.readFile('suffix-es6-exports.js', 'utf8', (err3, es6exports) => {
            if (err3) {
                console.error(err3)
                return
            }

            const content = [
                code,
                data,
                es6exports
            ].join("\n\n")
    
            fs.writeFile('../bundle/llama3-tokenizer-with-baked-data.js', content, err4 => {
                if (err4) {
                  console.error(err4)
                  return
                }
            });
        })

        // Create CommonJS bundle
        fs.readFile('suffix-commonjs-exports.js', 'utf8', (err3, commonJsExports) => {
            if (err3) {
                console.error(err3)
                return
            }

            const content = [
                code,
                data,
                commonJsExports
            ].join("\n\n")
    
            fs.writeFile('../bundle/commonjs-llama3-tokenizer-with-baked-data.js', content, err4 => {
                if (err4) {
                  console.error(err4)
                  return
                }
            });

            // Someone on GitHub requested that for them to load the file it has to end in .cjs,
            // and I didn't want to break existing filepaths, so we'll just have the same bundle in 2 different files.
            fs.writeFile('../bundle/commonjs-llama3-tokenizer-with-baked-data.cjs', content, err4 => {
                if (err4) {
                  console.error(err4)
                  return
                }
            });
        })

        console.log('bundles written successfully')
    })
});

