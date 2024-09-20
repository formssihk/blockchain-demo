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
    const updatedBlocks = [...blocks];

    // Find the previous block's hash
    const previousHash = index === 0 ? "0" : updatedBlocks[index - 1].hash;

    // Update the current block with the new previousHash and recalculate its hash
    const updatedBlock = {
      ...updatedBlocks[index],
      previousHash: previousHash, // Set previousHash to the hash of the previous block
      hash: calculateHash(updatedBlocks[index].index, updatedBlocks[index].data, previousHash), // Recalculate hash
    };

    updatedBlocks[index] = updatedBlock;
    setBlocks(updatedBlocks); // Update the state with the rehashed block
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
