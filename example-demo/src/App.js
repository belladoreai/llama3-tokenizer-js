import { useState } from "react";
import llama3Tokenizer from 'llama3-tokenizer-js'
import './App.css';

// Stylizing tokens is mostly copied from gpt-tokenizer demo.
const pastelColors = [
  "rgba(107,64,216,.3)",
  "rgba(104,222,122,.4)",
  "rgba(244,172,54,.4)",
  "rgba(239,65,70,.4)",
  "rgba(39,181,234,.4)",
];

const monospace = `"Roboto Mono",sfmono-regular,consolas,liberation mono,menlo,courier,monospace`;

const getRenderedWidth = (text) => {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  const measure = ctx.measureText(text)
  return measure.actualBoundingBoxRight - measure.actualBoundingBoxLeft
}

const getTextualRepresentationForToken = (tokenString) => {
  tokenString = tokenString.replaceAll(" ", "\u00A0").replaceAll("\n", "\\n")
  const width = getRenderedWidth(tokenString)
  if (width < 0.0001) {
    return `�`
  }
  return tokenString
}

const TokenizedText = ({ tokenStrings }) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      fontFamily: monospace,
      width: "100%",
      height: "200px",
      overflowY: "auto",
      padding: "8px",
      border: "1px solid #ccc",
      backgroundColor: "#f8f8f8",
      lineHeight: "1.5",
      alignContent: "flex-start",
    }}
  >
    {tokenStrings.map((tokenString, index) => (
      <span
        key={index}
        style={{
          backgroundColor: pastelColors[index % pastelColors.length],
          padding: "0 0px",
          borderRadius: "3px",
          marginRight: "0px",
          marginBottom: "4px",
          display: "inline-block",
          height: "1.5em",
        }}
      >
        {
          <pre>
            {getTextualRepresentationForToken(tokenString)}
          </pre>
        }
      </span>
    ))}
  </div>
);

const TokenIds = ({ tokenIds }) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      fontFamily: monospace,
      width: "100%",
      height: "200px",
      overflowY: "auto",
      padding: "8px",
      border: "1px solid #ccc",
      backgroundColor: "#f8f8f8",
      lineHeight: "1.5",
      alignContent: "flex-start",
    }}
  >
    [
    {tokenIds.map((tokenId, index) => (
      <span
        key={index}
        style={{
          backgroundColor: pastelColors[index % pastelColors.length],
          padding: "0 0px",
          borderRadius: "3px",
          marginRight: "0px",
          marginBottom: "4px",
          display: "inline-block",
          height: "1.5em",
        }}
      >
        {
          <pre>
            {`${tokenId}, `}
          </pre>
        }
      </span>
    ))}
    ]
  </div>
);

const App = () => {
  const [inputText, setInputText] = useState(
    "Replace this text in the input field...\n<|start_header_id|>...to see how 🦙 tokenization works.",
  )

  const encodedTokens = llama3Tokenizer.encode(inputText, { bos: false, eos: false });

  const decodedTokens = encodedTokens.map(token => {
    return llama3Tokenizer.decode([token])
  })

  return (
    <>
      <h1>
        Welcome to 🦙{" "}
        <a href="https://github.com/belladoreai/llama3-tokenizer-js" target="_blank">
        llama3-tokenizer-js 
        </a>{" "}🦙
        playground!
      </h1>
      <div className="container">
        <div className="tokenizer">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ fontFamily: monospace, width: "100%", height: "200px" }}
          />
        </div>

        <TokenizedText tokenStrings={decodedTokens} />
        <TokenIds tokenIds={encodedTokens} />

        <div className="statistics">
          <div className="stat">
            <div className="stat-value">{Array.from(inputText).length}</div>
            <div className="stat-label">Characters</div>
          </div>
          <div className="stat">
            <div className="stat-value">{encodedTokens.length}</div>
            <div className="stat-label">Tokens</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "right",
          }}
        >
          <a href="https://www.npmjs.com/package/llama3-tokenizer-js" target="_blank" style={{margin: "10px"}}>
            <img src="npm.png" alt="GitHub logo" width="100" />
          </a>
          <a href="https://github.com/belladoreai/llama3-tokenizer-js" target="_blank">
            <img src="github.png" alt="GitHub logo" width="100" />
          </a>
        </div>
      </div>
    </>
  );
};

export default App;
