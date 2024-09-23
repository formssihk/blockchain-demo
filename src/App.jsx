// src/App.jsx
import { useState } from 'react';
import Blockchain from './components/Blockchain';
import sha256 from 'crypto-js/sha256';
import './App.css';

function App() {
  const [nodes, setNodes] = useState([
    [createGenesisBlock()],
    [createGenesisBlock()],
    [createGenesisBlock()],
    [createGenesisBlock()],
  ]);

  const [newBlockData, setNewBlockData] = useState('');
  const [ticks, setTicks] = useState([false, false, false, false]); // Track tick icon for each node

  function createGenesisBlock() {
    const genBlk = "Genesis Block";
    return {
      index: 0,
      data: genBlk,
      previousHash: "0",
      hash: calculateHash(0, genBlk, "0"),
    };
  }

  function calculateHash(index, data, previousHash) {
    return sha256(index + data + previousHash).toString();
  }

  function addBlock() {
    if (newBlockData.trim() === '') {
      alert("Please enter data for the new block.");
      return;
    }

    // Create the new block to be added
    const newBlock = {
      index: nodes[0].length,
      data: newBlockData,
      previousHash: nodes[0][nodes[0].length - 1].hash,
      hash: calculateHash(nodes[0].length, newBlockData, nodes[0][nodes[0].length - 1].hash),
    };

    // Add the block to the first node immediately
    const updatedNodes = [...nodes];
    updatedNodes[0] = [...updatedNodes[0], newBlock];
    setNodes(updatedNodes);

    // Show the tick icon for the first node immediately
    setTicks([true, false, false, false]);

    // After 1 second, propagate the block to the other nodes
    setTimeout(() => {
      propagateBlockToOtherNodes(newBlock);
    }, 1000);

    setNewBlockData(''); // Clear input field
  }

  function propagateBlockToOtherNodes(newBlock) {
    const updatedNodes = nodes.map((blocks) => {
      return [...blocks, newBlock]; // Add block to all nodes including the first
    });
    setNodes(updatedNodes);

    // Show tick icon on all nodes after propagation
    setTicks([true, true, true, true]);
  }

  function updateBlock(nodeIndex, blockIndex, newData) {
    const updatedNodes = nodes.map((blocks, i) => {
      if (i === nodeIndex) {
        const updatedBlocks = blocks.map((block, j) => {
          if (j === blockIndex) {
            return {
              ...block,
              data: newData,
              hash: block.hash, // Keep the old hash to simulate tampering
            };
          }
          return block;
        });
        return updatedBlocks;
      }
      return blocks;
    });
    setNodes(updatedNodes);
  }

  function rehashBlock(nodeIndex, blockIndex) {
    const updatedNodes = [...nodes];
    const updatedBlocks = [...updatedNodes[nodeIndex]];

    const previousHash = blockIndex === 0 ? "0" : updatedBlocks[blockIndex - 1].hash;

    const updatedBlock = {
      ...updatedBlocks[blockIndex],
      previousHash: previousHash,
      hash: calculateHash(updatedBlocks[blockIndex].index, updatedBlocks[blockIndex].data, previousHash),
    };

    updatedBlocks[blockIndex] = updatedBlock;
    updatedNodes[nodeIndex] = updatedBlocks;
    setNodes(updatedNodes);
  }

  function resetBlockchain() {
    setNodes([
      [createGenesisBlock()],
      [createGenesisBlock()],
      [createGenesisBlock()],
      [createGenesisBlock()],
    ]);
    setNewBlockData(''); // Clear the input field
    setTicks([false, false, false, false]); // Reset the tick icons
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Blockchain Simulator (4 Nodes)</h1>
      
      <input
        type="text"
        value={newBlockData}
        onChange={(e) => setNewBlockData(e.target.value)}
        placeholder="Enter new block data"
        className="p-2 border rounded mr-4"
      />
      <button
        onClick={addBlock}
        className="p-2 bg-blue-500 text-white rounded mb-4"
      >
        Add Block
      </button>

      <button
        onClick={resetBlockchain}
        className="p-2 bg-orange-500 text-white rounded mb-4 ml-4"
      >
        Restart Blockchain
      </button>

      <div className="overflow-x-auto p-2">
        {nodes.map((blocks, nodeIndex) => (
          <Blockchain
            key={nodeIndex}
            blocks={blocks}
            updateBlock={(blockIndex, newData) => updateBlock(nodeIndex, blockIndex, newData)}
            rehashBlock={(blockIndex) => rehashBlock(nodeIndex, blockIndex)}
            showTick={ticks[nodeIndex]} // Pass the tick status to Blockchain component
            nodeIndex={nodeIndex}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
