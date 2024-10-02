/* eslint-disable react/prop-types */
import sha256 from 'crypto-js/sha256';

function Block({ block, 
  index, 
  updateBlock, 
  rehashBlock, 
  blocks, 
  showTick, 
  confirmBlock, 
  clientId,
  rejectBlock 
}) {
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
    let baseClass = 'w-1/2 lg:w-1/3 shrink-0 flex flex-col justify-between p-2 lg:p-4 border rounded shadow relative ';
    if (block.wasTampered) {
      baseClass += 'bg-red-200'; // Tampered block gets a red background
    } else if (isSubsequentBlocksInvalid) {
      baseClass += 'bg-red-100';
    } else if (block.isValid !== true ) {
      baseClass += 'bg-red-100';
    } else if (block.isConfirmed === false && block.isRejected === false) {
      baseClass += 'bg-green-100/10';
    } else if (block.isRejected === true) {
      baseClass += 'bg-orange-100';
    } else {
      baseClass += 'bg-green-100';
    }
    return baseClass;
  }

  function showStatusIcon(isSubsequentBlocksInvalid, block) {
    if (isSubsequentBlocksInvalid || block.isValid !== true || block.wasTampered) {
      return (
        <div className="absolute top-2 right-2">
          <span className="text-red-500">✗</span>
        </div>
      );
    } else if (block.isConfirmed === false && block.isRejected === false) {
      return (
        <div className="absolute top-2 right-2">
          <span className="text-yellow-500">?</span>
        </div>
      );
    } else if(block.isRejected === true) {
      return (
        <div className="absolute top-2 right-2">
          <span className="text-orange-500">!</span>
        </div>
      );
    } else {
      return (
        <div className="absolute top-2 right-2">
          <span className="text-green-500">✓</span>
        </div>
      );
    }
  }

  const formatHash = (hash) => {
    if (!hash || hash.length <= 10) {
      return hash; // Return the hash as is if it's too short
    }
    return `${hash.slice(0, 5)}...${hash.slice(-5)}`;
  };
  
  return (
    <div className={getBlockClass(isSubsequentBlocksInvalid, block)} >
      {showStatusIcon(isSubsequentBlocksInvalid, block)}
      <p className="text-lg font-bold">Block {block.index + 1}</p>
      <div className="mt-2">
        <label className="font-semibold">Data: </label>
        <input
          type="text"
          value={block.data}
          onChange={(e) => updateBlock(e.target.value)}
          className="p-1 lg:p-2 border rounded w-full text-sm"
          disabled={storedClientId === clientId ? false : true}
        />
      </div>
      <div>
        <p className="text-xs lg:text-sm mt-2 break-all"><strong>Previous Hash:</strong> {formatHash(block.previousHash)}</p>
        <p className="text-xs lg:text-sm mt-2 break-all"><strong>Current Hash:</strong> {formatHash(block.hash)}</p>
        <p className="text-xs lg:text-sm mt-2 break-all"><strong>Block Proposed by:</strong> {formatHash(block.addedBy)}</p>
        <p className="text-xs lg:text-sm mt-2 break-all"><strong>Block Confirmed:</strong> {block.isConfirmed ? 'Yes' : 'No'}</p>
      </div>
      {((isSubsequentBlocksInvalid && index > 0) || (block.isValid != true)) && <p className="text-red-500 mt-2">Block is invalid!</p>}
      { storedClientId === clientId &&
          <div className='w-full flex flex-wrap justify-center'>
            <div className='w-full lg:w-1/2 flex justify-center'>
              <button
                onClick={rehashBlock}
                className="w-full m-1 lg:m-2 p-2 bg-orange-400 text-white text-xs lg:text-sm rounded"
              >
                Rehash Block
              </button>
            </div>
            {(!block.isConfirmed && !block.isRejected) && 
              <div className='w-full flex-wrap flex justify-center'>
                <button
                  onClick={() => confirmBlock(block)}
                  className=" mx-1 lg:mx-2 lg:m-2 p-2 bg-green-500 text-white text-xs lg:text-sm rounded"
                >
                  Confirm Block
                </button>
                <button
                  onClick={() => rejectBlock(block)}
                  className=" mx-1 lg:mx-2 lg:m-2 p-2 bg-red-500 text-white text-xs lg:text-sm rounded"
                >
                  Reject Block
                </button>
              </div>
            }

        </div>
      }
    </div>
  );
}

export default Block;
