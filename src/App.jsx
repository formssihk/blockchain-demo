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

  function addBlock() {
    if (newBlockData.trim() === '') {
      alert("Please enter data for the new block.");
      return;
    }

    const updatedNodes = nodes.map((blocks) => {
      const previousBlock = blocks[blocks.length - 1];
      const newBlock = {
        index: blocks.length,
        data: newBlockData,
        previousHash: previousBlock.hash,
        hash: calculateHash(blocks.length, newBlockData, previousBlock.hash),
      };
      return [...blocks, newBlock];
    });

    setNodes(updatedNodes);
    setNewBlockData(''); 
  }

  function updateBlock(nodeIndex, blockIndex, newData) {
    const updatedNodes = nodes.map((blocks, i) => {
      if (i === nodeIndex) {
        const updatedBlocks = blocks.map((block, j) => {
          if (j === blockIndex) {
            return {
              ...block,
              data: newData,
              hash: block.hash, 
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

  function resyncInvalidatedNodes() {
    const majorityNode = findMajorityNode();
    const updatedNodes = nodes.map((blocks, i) => {
      if (!isChainValid(blocks)) {
        return majorityNode;
      }
      return blocks;
    });
    setNodes(updatedNodes);
  }

  function findMajorityNode() {
    const validNodes = nodes.filter(isChainValid);
    return validNodes[0];
  }

  function isChainValid(blocks) {
    for (let i = 1; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const previousBlock = blocks[i - 1];

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      const calculatedHash = calculateHash(currentBlock.index, currentBlock.data, currentBlock.previousHash);
      if (currentBlock.hash !== calculatedHash) {
        return false;
      }
    }
    return true;
  }

  // Function to reset the blockchain to the initial state
  function resetBlockchain() {
    setNodes([
      [createGenesisBlock()],
      [createGenesisBlock()],
      [createGenesisBlock()],
      [createGenesisBlock()],
    ]);
    setNewBlockData(''); // Clear the input field as well
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
        onClick={resyncInvalidatedNodes}
        className="p-2 bg-green-500 text-white rounded mb-4 ml-4"
      >
        Resync Invalidated Nodes
      </button>

      {/* New Reset Button */}
      <button
        onClick={resetBlockchain}
        className="p-2 bg-red-500 text-white rounded mb-4 ml-4"
      >
        Restart Blockchain
      </button>

      <div className="">
        {nodes.map((blocks, nodeIndex) => (
          <Blockchain
            key={nodeIndex}
            blocks={blocks}
            updateBlock={(blockIndex, newData) => updateBlock(nodeIndex, blockIndex, newData)}
            rehashBlock={(blockIndex) => rehashBlock(nodeIndex, blockIndex)}
            nodeIndex={nodeIndex}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
