/* eslint-disable react/prop-types */
// src/components/Block.jsx
import sha256 from 'crypto-js/sha256';

function Block({ block, index, updateBlock, rehashBlock, blocks, showTick }) {
  const previousBlock = index === 0 ? null : blocks[index - 1];

  // Check if the block's previous hash matches the hash of the previous block
  const isPreviousHashValid = previousBlock
    ? block.previousHash === previousBlock.hash
    : true;

  // Check if the current hash is correct by recalculating it
  const isCurrentHashValid = block.hash === sha256(block.index + block.data + block.previousHash).toString();

  // Determine if the block is valid
  const isValid = isPreviousHashValid && isCurrentHashValid;

  return (
    <div className={`w-1/2 block p-4 border rounded shadow mb-4 relative ${isValid ? 'bg-green-100' : 'bg-red-100'}`}>
      {/* Show tick icon if the block was added */}
      {showTick && (
        <div className="absolute top-2 right-2">
          <span className="text-green-500">&#10004;</span> {/* Tick Icon */}
        </div>
      )}
      <p className="text-lg font-bold">Block {block.index}</p>
      <div className="mt-2">
        <label className="font-semibold">Data: </label>
        <input
          type="text"
          value={block.data}
          onChange={(e) => updateBlock(index, e.target.value)}
          className="p-2 border rounded w-1/2"
        />
      </div>
      <p className="text-sm mt-2"><strong>Previous Hash:</strong> {block.previousHash}</p>
      <p className="text-sm mt-2"><strong>Current Hash:</strong> {block.hash}</p>
      {!isValid && <p className="text-red-500 mt-2">Blockchain is invalid!</p>}
      <button
        onClick={() => rehashBlock(index)}
        className="mt-2 p-2 bg-green-500 text-white rounded"
      >
        Rehash Block
      </button>
    </div>
  );
}

export default Block;
