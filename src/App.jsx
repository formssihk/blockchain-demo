// src/App.js
import { useState } from 'react';
import Blockchain from './components/Blockchain';
import sha256 from 'crypto-js/sha256';
import './App.css';

function App() {
  const [blocks, setBlocks] = useState([createGenesisBlock()]);

  function createGenesisBlock() {
    return {
      index: 0,
      data: "Genesis Block",
      previousHash: "0",
      hash: calculateHash(0, "Genesis Block", "0"),
    };
  }

  function calculateHash(index, data, previousHash) {
    return sha256(index + data + previousHash).toString();
  }

  function addBlock(data) {
    const previousBlock = blocks[blocks.length - 1];
    const newBlock = {
      index: blocks.length,
      data,
      previousHash: previousBlock.hash,
      hash: calculateHash(blocks.length, data, previousBlock.hash),
    };
    setBlocks([...blocks, newBlock]);
  }

  function updateBlock(index, newData) {
    const updatedBlocks = blocks.map((block, i) => {
      if (i === index) {
        return {
          ...block,
          data: newData,
          hash: block.hash, // Keep old hash to simulate tampering
        };
      }
      return block;
    });
    setBlocks(updatedBlocks);
  }

  function rehashBlock(index) {
    const updatedBlocks = blocks.map((block, i) => {
      if (i === index) {
        const previousHash = i === 0 ? "0" : blocks[i - 1].hash;
        return {
          ...block,
          hash: calculateHash(block.index, block.data, previousHash),
        };
      }
      return block;
    });
    setBlocks(updatedBlocks);
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Blockchain Simulation</h1>
      <Blockchain
        blocks={blocks}
        addBlock={addBlock}
        updateBlock={updateBlock}
        rehashBlock={rehashBlock}
      />
    </div>
  );
}

export default App;
