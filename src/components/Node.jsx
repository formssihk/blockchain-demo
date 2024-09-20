// src/components/Node.js
import  { useState } from 'react';
import Block from './Block';

// eslint-disable-next-line react/prop-types
function Node({ nodeIndex, blockchain, addBlock, updateBlock, rehashBlock }) {
  const [newBlockData, setNewBlockData] = useState('');

  return (
    <div className="node border p-4 rounded shadow">
      <h2 className="text-xl font-bold">Node {nodeIndex + 1}</h2>
      <div className="mb-4">
        <input
          type="text"
          value={newBlockData}
          onChange={(e) => setNewBlockData(e.target.value)}
          className="p-2 border rounded w-full"
          placeholder="Enter data for new block"
        />
        <button
          onClick={() => {
            addBlock(nodeIndex, newBlockData);
            setNewBlockData('');
          }}
          className="mt-2 p-2 bg-blue-500 text-white rounded w-full"
        >
          Add Block
        </button>
      </div>

      {blockchain.map((block, blockIndex) => (
        <Block
          key={blockIndex}
          block={block}
          updateBlock={(newData) => updateBlock(nodeIndex, blockIndex, newData)}
          rehashBlock={() => rehashBlock(nodeIndex, blockIndex)}
        />
      ))}
    </div>
  );
}

export default Node;
