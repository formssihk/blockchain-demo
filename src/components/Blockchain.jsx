// src/components/Blockchain.js
import  { useState } from 'react';
import Block from './Block';

// eslint-disable-next-line react/prop-types
function Blockchain({ blocks, addBlock, updateBlock, rehashBlock }) {
  const [newBlockData, setNewBlockData] = useState('');

  return (
    <div className="blockchain">
      <div className="mb-4">
        <input
          type="text"
          value={newBlockData}
          onChange={(e) => setNewBlockData(e.target.value)}
          className="p-2 border rounded w-64"
          placeholder="Enter data for new block"
        />
        <button
          onClick={() => {
            addBlock(newBlockData);
            setNewBlockData('');
          }}
          className="ml-2 p-2 bg-blue-500 text-white rounded"
        >
          Add Block
        </button>
      </div>

      <div className='flex overflow-x-auto whitespace-nowrap  space-x-2'>
        {blocks.map((block, index) => (
          <Block
            key={index}
            block={block}
            updateBlock={updateBlock}
            rehashBlock={rehashBlock}
            index={index}
            blocks={blocks}
          />
        ))}
      </div>
    </div>
  );
}

export default Blockchain;
