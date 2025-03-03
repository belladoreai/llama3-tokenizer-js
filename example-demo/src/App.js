import llama3Tokenizer from 'llama3-tokenizer-js';
import { useEffect, useRef, useState } from "react";
import './App.css';

// Stylizing tokens is mostly copied from gpt-tokenizer demo.
const pastelColors = [
  "rgba(107,64,216,.3)",
  "rgba(104,222,122,.4)",
  "rgba(244,172,54,.4)",
  "rgba(239,65,70,.4)",
  "rgba(39,181,234,.4)",
];

// Opaque versions of the same colors for hover state and lines
const opaqueColors = [
  "rgb(107,64,216)",
  "rgb(104,222,122)",
  "rgb(244,172,54)",
  "rgb(239,65,70)",
  "rgb(39,181,234)",
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

const ConnectingLines = ({ hoveredIndex, tokensRef, idsRef }) => {
  const svgRef = useRef(null);
  
  useEffect(() => {
    const handleResize = () => {
      const svg = svgRef.current;
      if (!svg) return;
      
      const containerEl = tokensRef.current?.closest('.container');
      if (containerEl) {
        const rect = containerEl.getBoundingClientRect();
        svg.setAttribute('width', rect.width);
        svg.setAttribute('height', rect.height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 0);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [tokensRef]);
  
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !tokensRef.current || !idsRef.current) return;
    
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    
    if (hoveredIndex !== null) {
      const tokenElements = tokensRef.current.querySelectorAll('span');
      const idElements = idsRef.current.querySelectorAll('span');
      
      if (tokenElements[hoveredIndex] && idElements[hoveredIndex]) {
        const tokenRect = tokenElements[hoveredIndex].getBoundingClientRect();
        const idRect = idElements[hoveredIndex].getBoundingClientRect();
        const containerEl = tokensRef.current.closest('.container');
        const containerRect = containerEl.getBoundingClientRect();
        
        const startX = tokenRect.left + (tokenRect.width / 2) - containerRect.left;
        const startY = tokenRect.top + (tokenRect.height / 2) - containerRect.top;
        const endX = idRect.left + (idRect.width / 2) - containerRect.left;
        const endY = idRect.top + (idRect.height / 2) - containerRect.top;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        line.setAttribute('stroke', opaqueColors[hoveredIndex % opaqueColors.length]);
        line.setAttribute('stroke-width', '2');
        
        svg.appendChild(line);
      }
    }
  }, [hoveredIndex, tokensRef, idsRef]);
  
  return (
    <svg 
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  );
};

const TokenizedText = ({ tokenStrings, hoveredIndex, setHoveredIndex, forwardRef }) => (
  <div
    ref={forwardRef}
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
      position: "relative",
    }}
  >
    {tokenStrings.map((tokenString, index) => (
      <span
        key={index}
        style={{
          backgroundColor: hoveredIndex === index 
            ? opaqueColors[index % opaqueColors.length] 
            : pastelColors[index % pastelColors.length],
          padding: "0 0px",
          borderRadius: "3px",
          marginRight: "0px",
          marginBottom: "4px",
          display: "inline-block",
          height: "1.5em",
          cursor: "pointer",
          transition: "transform 0.1s, background-color 0.2s, z-index 0s",
          transform: hoveredIndex === index ? "scale(1.05)" : "scale(1)",
          color: hoveredIndex === index ? "white" : "black",
          position: "relative",
          zIndex: hoveredIndex === index ? 3 : 1,
        }}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <pre>
          {getTextualRepresentationForToken(tokenString)}
        </pre>
      </span>
    ))}
  </div>
);

const TokenIds = ({ tokenIds, hoveredIndex, setHoveredIndex, forwardRef }) => (
  <div
    ref={forwardRef}
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
      position: "relative",
    }}
  >
    [
    {tokenIds.map((tokenId, index) => (
      <span
        key={index}
        style={{
          backgroundColor: hoveredIndex === index 
            ? opaqueColors[index % opaqueColors.length] 
            : pastelColors[index % pastelColors.length],
          padding: "0 0px",
          borderRadius: "3px",
          marginRight: "0px",
          marginBottom: "4px",
          display: "inline-block",
          height: "1.5em",
          cursor: "pointer",
          transition: "transform 0.1s, background-color 0.2s, z-index 0s",
          transform: hoveredIndex === index ? "scale(1.05)" : "scale(1)",
          color: hoveredIndex === index ? "white" : "black",
          position: "relative",
          zIndex: hoveredIndex === index ? 3 : 1,
        }}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <pre>
          {`${tokenId}, `}
        </pre>
      </span>
    ))}
    ]
  </div>
);

const App = () => {
  const [inputText, setInputText] = useState(
    "Replace this text in the input field...\n<|start_header_id|>...to see how 🦙 tokenization works.",
  )
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const tokensRef = useRef(null);
  const idsRef = useRef(null);

  const encodedTokens = llama3Tokenizer.encode(inputText, { bos: false, eos: false });
  const decodedTokens = encodedTokens.map(token => llama3Tokenizer.decode([token]));

  return (
    <>
      <h1>
        Welcome to 🦙{" "}
        <a href="https://github.com/belladoreai/llama3-tokenizer-js" target="_blank">
          llama3-tokenizer-js 
        </a>{" "}🦙
        playground!
      </h1>
      <div className="container" style={{ position: "relative" }}>
        <ConnectingLines 
          hoveredIndex={hoveredIndex} 
          tokensRef={tokensRef} 
          idsRef={idsRef} 
        />
        
        <div className="tokenizer">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ fontFamily: monospace, width: "100%", height: "200px" }}
          />
        </div>

        <TokenizedText 
          tokenStrings={decodedTokens} 
          hoveredIndex={hoveredIndex} 
          setHoveredIndex={setHoveredIndex}
          forwardRef={tokensRef}
        />
        
        <TokenIds 
          tokenIds={encodedTokens} 
          hoveredIndex={hoveredIndex} 
          setHoveredIndex={setHoveredIndex}
          forwardRef={idsRef}
        />

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
          <a href="https://www.npmjs.com/package/llama3-tokenizer-js" target="_blank" style={{ margin: "10px" }}>
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
