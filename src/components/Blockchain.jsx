/* eslint-disable react/prop-types */
// src/components/Blockchain.jsx
import Block from './Block';

function Blockchain({ blocks, updateBlock, rehashBlock, nodeIndex }) {
  return (
    <>
      <h2 className="font-bold">Node {nodeIndex + 1}</h2>
      <div className="flex overflow-x-auto p-2 space-x-4 border p-4">
        {blocks.map((block, index) => (
          <Block
            key={index}
            block={block}
            index={index}
            updateBlock={updateBlock}
            rehashBlock={rehashBlock}
            blocks={blocks}
          />
        ))}
      </div>
    </>
  );
}

export default Blockchain;
