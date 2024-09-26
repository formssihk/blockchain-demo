/* eslint-disable react/prop-types */
import sha256 from 'crypto-js/sha256';

function Block({ block, index, updateBlock, rehashBlock, blocks, showTick, confirmBlock, clientId }) {
  const previousBlock = index === 0 ? null : blocks[index - 1];
  const storedClientId = localStorage.getItem('clientId');

  const isPreviousHashValid = previousBlock
    ? block.previousHash === previousBlock.hash
    : true;

  const isCurrentHashValid = block.hash === sha256(block.index + block.data + block.previousHash).toString();

  const isValid = isPreviousHashValid && isCurrentHashValid;

  let isSubsequentBlocksInvalid = false;
  if (!isValid) {
    isSubsequentBlocksInvalid = true;
  }

  for (let i = 0; i < index; i++) {
    const previousBlock = blocks[i];
    const prevHashValid = previousBlock.previousHash === (i === 0 ? "0" : blocks[i - 1].hash);
    const currHashValid = previousBlock.hash === sha256(previousBlock.index + previousBlock.data + previousBlock.previousHash).toString();

    if (!prevHashValid || !currHashValid) {
      isSubsequentBlocksInvalid = true;
      break;
    }
  }

  function getBlockClass(isSubsequentBlocksInvalid, block) {
    let baseClass = 'w-1/3 flex flex-col justify-between p-4 border rounded shadow mb-4 relative ';
    if (isSubsequentBlocksInvalid) {
      baseClass += 'bg-red-100';
    } else if (block.isValid !== true) {
      baseClass += 'bg-red-100';
    } else if (block.isConfirmed === false) {
      baseClass += 'bg-green-100/10';
    } else {
      baseClass += 'bg-green-100';
    }
  
    return baseClass;
  }
  
  

  return (
    <div className={getBlockClass(isSubsequentBlocksInvalid, block)}>
      {isSubsequentBlocksInvalid || block.isValid !== true ? 
        <div className="absolute top-2 right-2">
          <span className="text-red-500">✗</span> 
        </div> :
        <div className="absolute top-2 right-2">
          <span className="text-green-500">✓</span> 
        </div> 
      }
      <p className="text-lg font-bold">Block {block.index + 1}</p>
      <div className="mt-2">
        <label className="font-semibold">Data: </label>
        <input
          type="text"
          value={block.data}
          onChange={(e) => updateBlock(e.target.value)}
          className="p-2 border rounded w-1/2 text-sm"
          disabled={storedClientId === clientId ? false : true}
        />
      </div>
      <div>
        <p className="text-sm mt-2 break-all"><strong>Previous Hash:</strong> {block.previousHash}</p>
        <p className="text-sm mt-2 break-all"><strong>Current Hash:</strong> {block.hash}</p>
        <p className="text-sm mt-2 break-all"><strong>Block Proposed by:</strong> {block.addedBy}</p>
        <p className="text-sm mt-2 break-all"><strong>Block Confirmed:</strong> {block.isConfirmed ? 'Yes' : 'No'}</p>
      </div>
      {((isSubsequentBlocksInvalid && index > 0) || (block.isValid != true)) && <p className="text-red-500 mt-2">Block is invalid!</p>}
      { storedClientId === clientId &&
          <div className='space-x-4'>
          <button
            onClick={rehashBlock}
            className="mt-2 p-2 bg-green-500 text-white rounded"
          >
            Rehash Block
          </button>
          {!block.isConfirmed && <button
            onClick={() => confirmBlock(block)}
            className="mt-2 p-2 bg-green-500 text-white rounded"
          >
            Confirm Block
          </button>}
        </div>
      }
    </div>
  );
}

export default Block;
